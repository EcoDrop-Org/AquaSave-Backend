import type { PlantSpecies } from '../../device-management/domain/plant-species.js';
import type { ProfileType } from '../../identity-access/domain/profile-type.js';
import type { CareTip, IrrigationAdvice } from '../domain/recommendation.js';

const FETCH_TIMEOUT_MS = 6_000;

/**
 * Capa opcional de LLM sobre el motor de reglas.
 *
 * Nunca decide si hay que regar: solo reescribe el texto que ya produjeron
 * las reglas, asi una respuesta rara del modelo no provoca un riego indebido.
 * Ante key ausente, cuota agotada, timeout o JSON invalido devuelve
 * `undefined` y el llamador se queda con el texto de reglas.
 */
export class GeminiAdviceService {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /** Devuelve undefined si el LLM no esta disponible o falla. */
  async enrich(input: {
    species: PlantSpecies;
    profileType: ProfileType;
    advice: IrrigationAdvice;
    soilMoisturePct?: number;
    temperatureC?: number;
  }): Promise<{ body: string; tips: CareTip[] } | undefined> {
    if (!this.apiKey) return undefined;

    try {
      const text = await this.generate(this.buildPrompt(input));
      return this.parse(text);
    } catch (err) {
      // El llamador se queda con el texto de reglas.
      console.warn(
        '[Gemini] No disponible, se usa el motor de reglas:',
        err instanceof Error ? err.message : err,
      );
      return undefined;
    }
  }

  private buildPrompt(input: {
    species: PlantSpecies;
    profileType: ProfileType;
    advice: IrrigationAdvice;
    soilMoisturePct?: number;
    temperatureC?: number;
  }): string {
    const { species, profileType, advice } = input;
    const tone =
      profileType === 'principiante'
        ? 'Explica con palabras simples, sin jerga tecnica, y di que accion ' +
          'tomar. El usuario esta aprendiendo a cuidar plantas.'
        : 'Se directo y concreto, incluye las cifras. El usuario tiene ' +
          'experiencia cuidando plantas y quiere los datos.';

    return [
      'Eres un asistente de jardineria domestica en Lima, Peru.',
      '',
      `Planta: ${species.commonName}`,
      `Humedad ideal del suelo: ${species.soilMinPct}-${species.soilMaxPct}%`,
      `Luz que necesita: ${species.sunlight}`,
      input.soilMoisturePct !== undefined
        ? `Humedad actual del suelo: ${Math.round(input.soilMoisturePct)}%`
        : 'Humedad actual: sin lectura (no hay dispositivo conectado)',
      input.temperatureC !== undefined
        ? `Temperatura: ${input.temperatureC.toFixed(1)} C`
        : '',
      '',
      `Diagnostico ya decidido (NO lo contradigas): ${advice.title}`,
      `Motivo: ${advice.reason}`,
      '',
      tone,
      '',
      'Responde SOLO con JSON valido, sin markdown, con esta forma exacta:',
      '{"body":"2 frases maximo sobre el riego","tips":[{"icon":"sun","title":"Luz","body":"..."},{"icon":"water","title":"Riego","body":"..."},{"icon":"bug","title":"Plagas","body":"..."}]}',
      '',
      'icon solo puede ser: sun, water, bug o leaf.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /** Llama al modelo. `json` fuerza respuesta JSON (lo usa enrich). */
  async generate(prompt: string, json = true): Promise<string> {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: json ? 0.4 : 0.7,
          // Con 600 el JSON se truncaba: los modelos recientes gastan
          // tokens de razonamiento antes del texto.
          maxOutputTokens: 2000,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(body.error?.message ?? `HTTP ${response.status}`);
    }

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Respuesta sin contenido');
    return text;
  }

  /** Descarta lo que no cumpla la forma esperada. */
  private parse(text: string): { body: string; tips: CareTip[] } | undefined {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      body?: unknown;
      tips?: unknown;
    };

    const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
    if (!body) return undefined;

    const allowedIcons = new Set(['sun', 'water', 'bug', 'leaf']);
    const tips: CareTip[] = Array.isArray(parsed.tips)
      ? parsed.tips
          .filter(
            (tip): tip is { icon: string; title: string; body: string } =>
              typeof tip === 'object' &&
              tip !== null &&
              typeof (tip as { title?: unknown }).title === 'string' &&
              typeof (tip as { body?: unknown }).body === 'string',
          )
          .slice(0, 4)
          .map((tip) => ({
            icon: (allowedIcons.has(tip.icon)
              ? tip.icon
              : 'leaf') as CareTip['icon'],
            title: tip.title.trim(),
            body: tip.body.trim(),
          }))
      : [];

    return { body, tips };
  }
}
