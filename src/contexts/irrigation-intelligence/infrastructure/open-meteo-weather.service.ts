import { badRequest } from '../../../shared/http/http-error.js';
import type { Device } from '../../device-management/domain/device.js';
import type { WeatherIntegrationService } from '../domain/ports/weather-integration-service.js';
import type { WeatherForecast } from '../domain/weather-forecast.js';

type ResolvedLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

// Open-Meteo a veces tarda o no responde; sin timeout la peticion quedaba
// colgada y el clima "a veces salia y a veces no".
const FETCH_TIMEOUT_MS = 8_000;

export class OpenMeteoWeatherService implements WeatherIntegrationService {
  // Cache en memoria por dispositivo. Open-Meteo tiene limite diario de
  // peticiones (que este proyecto ya agoto alguna vez: "Daily API request
  // limit exceeded"); reutilizar el pronostico mientras siga vigente
  // (validUntil) reduce las llamadas a una cada 30 min por dispositivo.
  private readonly cache = new Map<string, WeatherForecast>();

  async getForecastForDevice(device: Device): Promise<WeatherForecast> {
    const cached = this.cache.get(device.id);
    if (cached && Date.parse(cached.validUntil) > Date.now()) {
      return cached;
    }

    try {
      const forecast = await this.fetchLiveForecast(device);
      this.cache.set(device.id, forecast);
      return forecast;
    } catch (err) {
      // La API externa fallo (timeout, cuota diaria, geocoding, red):
      // responder un pronostico por defecto (20 C) en lugar de romper la
      // pantalla. Tambien se cachea (5 min) para no insistir al proveedor.
      console.warn(
        `[Weather] Proveedor externo fallo (${device.id}):`,
        err instanceof Error ? err.message : err,
      );
      const fallback = fallbackForecast(device);
      this.cache.set(device.id, fallback);
      return fallback;
    }
  }

  private async fetchLiveForecast(device: Device): Promise<WeatherForecast> {
    const location =
      device.location.latitude !== undefined &&
      device.location.longitude !== undefined
        ? {
            name: device.location.label,
            latitude: device.location.latitude,
            longitude: device.location.longitude,
          }
        : await this.resolveLocation(device.location.label);

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
      ].join(','),
    );
    url.searchParams.set('daily', 'precipitation_probability_max');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw badRequest(String(body.reason ?? 'Weather provider error'));
    }

    return toForecast(device.id, location, body);
  }

  private async resolveLocation(label: string): Promise<ResolvedLocation> {
    const candidates = locationCandidates(label);

    for (const candidate of candidates) {
      const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
      url.searchParams.set('name', candidate);
      url.searchParams.set('count', '1');
      url.searchParams.set('language', 'es');
      url.searchParams.set('countryCode', 'PE');

      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const body = (await response.json()) as {
        results?: Array<Record<string, unknown>>;
        reason?: string;
      };

      if (!response.ok) {
        throw badRequest(String(body.reason ?? 'Geocoding provider error'));
      }

      const result = body.results?.[0];
      if (!result) continue;

      return {
        name: displayName(result),
        latitude: Number(result.latitude),
        longitude: Number(result.longitude),
      };
    }

    throw badRequest('Could not resolve device location');
  }
}

// Pronostico por defecto cuando la API externa no responde: 20 C y valores
// neutros. `validUntil` corto para que la app reintente pronto y recupere el
// clima real en cuanto el proveedor vuelva.
const fallbackForecast = (device: Device): WeatherForecast => ({
  deviceId: device.id,
  locationName: device.location.label,
  latitude: device.location.latitude ?? 0,
  longitude: device.location.longitude ?? 0,
  temperatureC: 20,
  apparentTemperatureC: 20,
  humidityPct: 60,
  rainProbabilityPct: 0,
  precipitationMm: 0,
  windSpeedKmh: 0,
  conditionLabel: 'Clima estimado',
  retrievedAt: new Date().toISOString(),
  validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
});

const toForecast = (
  deviceId: string,
  location: ResolvedLocation,
  body: Record<string, unknown>,
): WeatherForecast => {
  const current = body.current as Record<string, unknown>;
  const daily = body.daily as Record<string, unknown> | undefined;
  const rainProbabilities =
    (daily?.precipitation_probability_max as unknown[] | undefined) ?? [];
  const weatherCode = Number(current.weather_code ?? 0);
  const retrievedAt = new Date().toISOString();

  return {
    deviceId,
    locationName: location.name,
    latitude: Number(body.latitude ?? location.latitude),
    longitude: Number(body.longitude ?? location.longitude),
    temperatureC: Number(current.temperature_2m ?? 0),
    apparentTemperatureC: Number(current.apparent_temperature ?? 0),
    humidityPct: Number(current.relative_humidity_2m ?? 0),
    rainProbabilityPct: Number(rainProbabilities[0] ?? 0),
    precipitationMm: Number(current.precipitation ?? 0),
    windSpeedKmh: Number(current.wind_speed_10m ?? 0),
    conditionLabel: conditionLabel(weatherCode),
    retrievedAt,
    validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
};

const locationCandidates = (label: string): string[] => {
  const normalized = label.trim();
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  return [...new Set([normalized, ...parts, parts.at(-1), 'Lima'])].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
};

const displayName = (result: Record<string, unknown>): string => {
  return [result.name, result.admin3, result.admin2, result.admin1, result.country]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(', ');
};

const conditionLabel = (code: number): string => {
  if (code === 0) return 'Despejado';
  if ([1, 2, 3].includes(code)) return 'Parcialmente nublado';
  if ([45, 48].includes(code)) return 'Neblina';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve';
  if ([95, 96, 99].includes(code)) return 'Tormenta';
  return 'Clima variable';
};
