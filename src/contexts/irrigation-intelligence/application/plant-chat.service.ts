import { notFound } from '../../../shared/http/http-error.js';
import type { Device } from '../../device-management/domain/device.js';
import { speciesById } from '../../device-management/domain/plant-species.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import { normalizeProfileType } from '../../identity-access/domain/profile-type.js';
import type { UserRepository } from '../../identity-access/domain/repositories/user-repository.js';
import type { GeminiAdviceService } from '../infrastructure/gemini-advice.service.js';

/** Planta que el usuario puede elegir en el chat. */
export type ChatPlantOption = {
  deviceId: string;
  name: string;
  speciesName: string;
  soilMoisturePct?: number;
  hasIrrigationDevice: boolean;
};

export type ChatTurn = {
  role: 'user' | 'assistant';
  text: string;
};

export type ChatReply = {
  /** Respuesta del asistente. */
  text: string;
  /** Plantas para mostrar como botones cuando conviene elegir una. */
  options: ChatPlantOption[];
  source: 'rules' | 'ai';
};

const MAX_HISTORY = 8;

/**
 * Chat sobre las plantas del usuario.
 *
 * El contexto se arma con las plantas reales de la cuenta y su ultima lectura,
 * asi la IA responde con datos y no en abstracto. Si no hay cuota de LLM
 * responde igual con un resumen de las reglas, para que el chat nunca quede
 * mudo.
 */
export class PlantChatService {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly users: UserRepository,
    private readonly gemini: GeminiAdviceService,
  ) {}

  /** Plantas de la cuenta, para los botones del saludo inicial. */
  async listPlants(accountId: string): Promise<ChatPlantOption[]> {
    const devices = await this.devices.findByAccountId(accountId);
    return devices.map(toOption);
  }

  async reply(input: {
    accountId: string;
    message: string;
    /** Planta sobre la que se pregunta, si el usuario ya eligio una. */
    deviceId?: string;
    history?: ChatTurn[];
  }): Promise<ChatReply> {
    const devices = await this.devices.findByAccountId(input.accountId);
    const options = devices.map(toOption);

    if (input.deviceId) {
      const exists = devices.some((d) => d.id === input.deviceId);
      if (!exists) throw notFound('Device not found');
    }

    if (devices.length === 0) {
      return {
        text:
          'Todavia no tienes plantas registradas. Agrega una desde "Mis ' +
          'plantas" y te ayudo a cuidarla.',
        options: [],
        source: 'rules',
      };
    }

    const user = await this.users.findById(input.accountId);
    const profileType = normalizeProfileType(user?.profile.profileType);
    const focus = input.deviceId
      ? devices.find((d) => d.id === input.deviceId)
      : undefined;

    // Saludo sin pregunta concreta: ofrecer las plantas como botones.
    if (!focus && isGreeting(input.message)) {
      return {
        text:
          devices.length === 1
            ? `Hola. Puedo contarte como esta tu ${devices[0]!.name}. ` +
              'Toca su nombre o preguntame lo que quieras.'
            : 'Hola. ¿Sobre cual de tus plantas quieres saber?',
        options,
        source: 'rules',
      };
    }

    const prompt = buildPrompt({
      devices,
      focus,
      profileType,
      message: input.message,
      history: (input.history ?? []).slice(-MAX_HISTORY),
    });

    try {
      const text = await this.gemini.generate(prompt, false);
      const clean = text.trim();
      if (!clean) throw new Error('Respuesta vacia');
      return {
        text: clean,
        // Sin planta elegida se dejan los botones para acotar la siguiente.
        options: focus ? [] : options,
        source: 'ai',
      };
    } catch (err) {
      console.warn(
        '[Chat] LLM no disponible, se responde con reglas:',
        err instanceof Error ? err.message : err,
      );
      return {
        text: fallbackAnswer(focus ?? devices[0]!),
        options: focus ? [] : options,
        source: 'rules',
      };
    }
  }
}

const toOption = (device: Device): ChatPlantOption => ({
  deviceId: device.id,
  name: device.name,
  speciesName: speciesById(device.speciesId).commonName,
  soilMoisturePct: device.lastTelemetry?.soilMoisturePct,
  hasIrrigationDevice: device.lastTelemetry !== undefined,
});

const GREETINGS = [
  'hola',
  'buenas',
  'hey',
  'ayuda',
  'que tal',
  'qué tal',
  'buenos dias',
  'buenos días',
  'buenas tardes',
  'buenas noches',
];

const isGreeting = (message: string): boolean => {
  const text = message.trim().toLowerCase().replace(/[!¡.?¿,]/g, '');
  if (!text) return true;
  // Un saludo es corto; "hola, por que mi albahaca esta seca" no lo es.
  return text.split(/\s+/).length <= 3 && GREETINGS.some((g) => text.includes(g));
};

const buildPrompt = (input: {
  devices: Device[];
  focus?: Device;
  profileType: string;
  message: string;
  history: ChatTurn[];
}): string => {
  const lines: string[] = [
    'Eres el asistente de AquaSave, una app de riego para plantas de casa ' +
      'en Lima, Peru.',
    '',
    'PLANTAS DEL USUARIO:',
  ];

  for (const device of input.devices) {
    const species = speciesById(device.speciesId);
    const soil = device.lastTelemetry?.soilMoisturePct;
    const parts = [
      `- ${device.name} (${species.commonName})`,
      `humedad ideal ${species.soilMinPct}-${species.soilMaxPct}%`,
      soil === undefined
        ? 'sin dispositivo de riego conectado'
        : `humedad actual ${Math.round(soil)}%`,
      device.isActive ? 'riego activo' : 'riego en pausa',
      `luz: ${species.sunlight}`,
    ];
    lines.push(parts.join(' | '));
  }

  if (input.focus) {
    lines.push('', `El usuario pregunta sobre: ${input.focus.name}.`);
  }

  if (input.history.length > 0) {
    lines.push('', 'CONVERSACION PREVIA:');
    for (const turn of input.history) {
      lines.push(`${turn.role === 'user' ? 'Usuario' : 'Tu'}: ${turn.text}`);
    }
  }

  lines.push(
    '',
    `PREGUNTA: ${input.message}`,
    '',
    'REGLAS:',
    '- Responde solo sobre el cuidado de estas plantas.',
    '- Usa los datos de arriba; no inventes lecturas.',
    '- Maximo 4 frases, en espanol, sin markdown ni listas con viñetas.',
    input.profileType === 'principiante'
      ? '- El usuario esta aprendiendo: explica simple y di que hacer.'
      : '- El usuario tiene experiencia: se concreto e incluye las cifras.',
    '- Si preguntan algo ajeno a las plantas, dilo amablemente y reconduce.',
  );

  return lines.join('\n');
};

/** Resumen por reglas, para cuando el LLM no responde. */
const fallbackAnswer = (device: Device): string => {
  const species = speciesById(device.speciesId);
  const soil = device.lastTelemetry?.soilMoisturePct;

  if (soil === undefined) {
    return (
      `${device.name} (${species.commonName}) todavia no tiene dispositivo ` +
      `de riego conectado. Necesita entre ${species.soilMinPct}% y ` +
      `${species.soilMaxPct}% de humedad en la tierra.`
    );
  }

  const rounded = Math.round(soil);
  if (rounded < species.soilMinPct) {
    return (
      `${device.name} esta en ${rounded}% de humedad, por debajo del minimo ` +
      `de la ${species.commonName.toLowerCase()} (${species.soilMinPct}%). ` +
      'Conviene regarla.'
    );
  }
  if (rounded > species.soilMaxPct) {
    return (
      `${device.name} esta en ${rounded}%, por encima del maximo ` +
      `(${species.soilMaxPct}%). Deja que la tierra se seque antes de ` +
      'volver a regar.'
    );
  }
  return (
    `${device.name} esta en ${rounded}% de humedad, dentro del rango que ` +
    `necesita (${species.soilMinPct}-${species.soilMaxPct}%). Todo bien.`
  );
};
