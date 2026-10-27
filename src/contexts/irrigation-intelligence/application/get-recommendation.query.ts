import { notFound } from '../../../shared/http/http-error.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import { speciesById } from '../../device-management/domain/plant-species.js';
import type { UserRepository } from '../../identity-access/domain/repositories/user-repository.js';
import { normalizeProfileType } from '../../identity-access/domain/profile-type.js';
import {
  buildCareTips,
  buildIrrigationAdvice,
  type Recommendation,
} from '../domain/recommendation.js';
import type { CareTip } from '../domain/recommendation.js';
import type { WeatherIntegrationService } from '../domain/ports/weather-integration-service.js';
import type { GeminiAdviceService } from '../infrastructure/gemini-advice.service.js';
import type { PerenualPlantInfoService } from '../infrastructure/perenual-plant-info.service.js';

/** Cuanto se reutiliza una recomendacion antes de recalcularla. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Recomendacion completa: `irrigation` (si regar, siempre por reglas),
 * `care` (cuidados, sirven sin dispositivo) e `info` (ficha, opcional).
 *
 * El LLM y Perenual son mejoras: si fallan, la respuesta sigue siendo util.
 */
export class GetRecommendationQuery {
  private readonly cache = new Map<
    string,
    { value: Recommendation; expiresAt: number }
  >();

  constructor(
    private readonly devices: DeviceRepository,
    private readonly users: UserRepository,
    private readonly weather: WeatherIntegrationService,
    private readonly gemini: GeminiAdviceService,
    private readonly plantInfo: PerenualPlantInfoService,
  ) {}

  async execute(deviceId: string, accountId: string): Promise<Recommendation> {
    const device = await this.devices.findById(deviceId);
    if (!device || device.accountId !== accountId) {
      throw notFound('Device not found');
    }

    // Se invalida al cambiar la lectura: no repetir "hora de regar"
    // cuando el usuario ya rego.
    const cacheKey =
      `${deviceId}:${device.lastTelemetry?.soilMoisturePct ?? 'none'}:` +
      `${device.isActive}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const species = speciesById(device.speciesId);

    // El segmento define el tono (informe 1.3).
    const user = await this.users.findById(accountId);
    const profileType = normalizeProfileType(user?.profile.profileType);

    // Opcional: si falla del todo, se calcula sin el.
    let forecast;
    try {
      forecast = await this.weather.getForecastForDevice(device);
    } catch {
      forecast = undefined;
    }

    // Decision de riego: siempre por reglas.
    const advice = buildIrrigationAdvice(device, forecast, profileType);
    let care: { tips: CareTip[]; source: 'rules' | 'ai' } = {
      tips: buildCareTips(species),
      source: 'rules',
    };
    let irrigation = advice;

    // Opcional: el LLM reescribe el texto y amplia consejos.
    const enriched = await this.gemini.enrich({
      species,
      profileType,
      advice,
      soilMoisturePct: device.lastTelemetry?.soilMoisturePct,
      temperatureC: forecast?.temperatureC,
    });

    if (enriched) {
      // level y reason siguen siendo de las reglas: el LLM solo cambia
      // como se cuenta.
      irrigation = { ...advice, body: enriched.body, source: 'ai' };
      if (enriched.tips.length > 0) {
        care = { tips: enriched.tips, source: 'ai' };
      }
    }

    const info = await this.plantInfo.getInfo(species);

    const now = Date.now();
    const recommendation: Recommendation = {
      deviceId: device.id,
      speciesId: species.id,
      speciesName: species.commonName,
      irrigation,
      care,
      info,
      generatedAt: new Date(now).toISOString(),
      validUntil: new Date(now + CACHE_TTL_MS).toISOString(),
    };

    this.cache.set(cacheKey, {
      value: recommendation,
      expiresAt: now + CACHE_TTL_MS,
    });

    return recommendation;
  }
}
