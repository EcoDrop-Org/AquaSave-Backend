import { badRequest } from '../../../shared/http/http-error.js';
import type { Device } from '../../device-management/domain/device.js';
import type { WeatherIntegrationService } from '../domain/ports/weather-integration-service.js';
import type { WeatherForecast } from '../domain/weather-forecast.js';

type ResolvedLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

export class OpenMeteoWeatherService implements WeatherIntegrationService {
  async getForecastForDevice(device: Device): Promise<WeatherForecast> {
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

    const response = await fetch(url);
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

      const response = await fetch(url);
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
