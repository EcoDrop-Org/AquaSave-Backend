import { describe, expect, it } from 'vitest';

import type { Device } from '../../device-management/domain/device.js';
import { speciesById } from '../../device-management/domain/plant-species.js';
import type { WeatherForecast } from './weather-forecast.js';
import { buildCareTips, buildIrrigationAdvice } from './recommendation.js';

const deviceWith = (overrides: Partial<Device> = {}): Device => ({
  id: 'dev-1',
  accountId: 'acc-1',
  name: 'Mi albahaca',
  location: { label: 'Lima' },
  status: 'online',
  isActive: true,
  plantCount: 1,
  speciesId: 'albahaca', // rango 45-70%
  valveState: 'closed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const reading = (soilMoisturePct: number) => ({
  deviceId: 'dev-1',
  soilMoisturePct,
  temperatureC: 22,
  recordedAt: new Date().toISOString(),
});

const forecastWith = (
  overrides: Partial<WeatherForecast> = {},
): WeatherForecast => ({
  deviceId: 'dev-1',
  locationName: 'Lima',
  latitude: -12,
  longitude: -77,
  temperatureC: 22,
  apparentTemperatureC: 22,
  humidityPct: 60,
  rainProbabilityPct: 0,
  precipitationMm: 0,
  windSpeedKmh: 5,
  conditionLabel: 'Despejado',
  isEstimated: false,
  retrievedAt: new Date().toISOString(),
  validUntil: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
});

describe('buildIrrigationAdvice', () => {
  it('pide regar cuando el suelo esta bajo el minimo de la especie', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ lastTelemetry: reading(32) }),
      forecastWith(),
      'principiante',
    );

    expect(advice.level).toBe('act');
    expect(advice.title).toBe('Hora de regar');
    expect(advice.reason).toContain('32%');
  });

  it('no pide regar cuando el suelo esta en rango', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ lastTelemetry: reading(58) }),
      forecastWith(),
      'principiante',
    );

    expect(advice.level).toBe('ok');
  });

  it('avisa de exceso de agua sobre el maximo de la especie', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ lastTelemetry: reading(85) }),
      forecastWith(),
      'experto',
    );

    expect(advice.level).toBe('act');
    expect(advice.title).toBe('Exceso de agua');
  });

  it('prioriza la lluvia sobre regar un suelo seco', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ lastTelemetry: reading(32) }),
      forecastWith({ rainProbabilityPct: 90 }),
      'principiante',
    );

    expect(advice.level).toBe('watch');
    expect(advice.title).toContain('llover');
  });

  it('usa los umbrales propios de cada especie', () => {
    // 30% es sequedad para la albahaca (min 45) pero normal para un cactus
    // (rango 5-25, asi que 30 esta por encima del maximo).
    const albahaca = buildIrrigationAdvice(
      deviceWith({ speciesId: 'albahaca', lastTelemetry: reading(30) }),
      forecastWith(),
      'experto',
    );
    const cactus = buildIrrigationAdvice(
      deviceWith({ speciesId: 'cactus', lastTelemetry: reading(30) }),
      forecastWith(),
      'experto',
    );

    expect(albahaca.title).toBe('Hora de regar');
    expect(cactus.title).toBe('Exceso de agua');
  });

  it('pide conectar el dispositivo cuando no hay telemetria', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ lastTelemetry: undefined }),
      forecastWith(),
      'principiante',
    );

    expect(advice.title).toContain('Conecta');
    expect(advice.source).toBe('rules');
  });

  it('avisa que el riego esta en pausa', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ isActive: false, lastTelemetry: reading(20) }),
      forecastWith(),
      'principiante',
    );

    expect(advice.title).toBe('Riego en pausa');
  });

  it('funciona sin pronostico del clima', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ lastTelemetry: reading(32) }),
      undefined,
      'principiante',
    );

    expect(advice.level).toBe('act');
  });

  it('redacta distinto para principiante y experto', () => {
    const device = deviceWith({ lastTelemetry: reading(32) });
    const beginner = buildIrrigationAdvice(device, forecastWith(), 'principiante');
    const expert = buildIrrigationAdvice(device, forecastWith(), 'experto');

    expect(beginner.body).not.toBe(expert.body);
    // El mismo diagnostico para los dos: solo cambia como se cuenta.
    expect(beginner.level).toBe(expert.level);
  });

  it('cae a umbrales genericos con una especie desconocida', () => {
    const advice = buildIrrigationAdvice(
      deviceWith({ speciesId: 'planta-inventada', lastTelemetry: reading(55) }),
      forecastWith(),
      'experto',
    );

    // Generica es 40-70%: 55 esta en rango.
    expect(advice.level).toBe('ok');
  });
});

describe('buildCareTips', () => {
  it('incluye luz, riego y el consejo de la especie', () => {
    const tips = buildCareTips(speciesById('albahaca'));

    expect(tips.map((t) => t.icon)).toContain('sun');
    expect(tips.map((t) => t.icon)).toContain('water');
    expect(tips.some((t) => t.body.includes('45'))).toBe(true);
  });

  it('omite el consejo cuando la especie generica no tiene', () => {
    const tips = buildCareTips(speciesById('otra'));

    expect(tips).toHaveLength(2);
  });
});
