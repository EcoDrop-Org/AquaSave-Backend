import { describe, expect, it } from 'vitest';

import { defaultMoistureThreshold } from '../moisture-threshold.js';
import { IrrigationDecisionService } from './irrigation-decision.service.js';

describe('IrrigationDecisionService', () => {
  const service = new IrrigationDecisionService();

  it('starts irrigation when soil moisture is below the minimum threshold', () => {
    const decision = service.evaluate({
      threshold: defaultMoistureThreshold,
      telemetry: {
        deviceId: 'device-1',
        soilMoisturePct: 20,
        temperatureC: 24,
        recordedAt: new Date().toISOString(),
      },
    });

    expect(decision.action).toBe('start');
  });

  it('pauses irrigation when weather indicates rain risk', () => {
    const decision = service.evaluate({
      threshold: defaultMoistureThreshold,
      telemetry: {
        deviceId: 'device-1',
        soilMoisturePct: 20,
        temperatureC: 24,
        recordedAt: new Date().toISOString(),
      },
      forecast: {
        deviceId: 'device-1',
        locationName: 'Lima',
        latitude: -12,
        longitude: -77,
        temperatureC: 24,
        apparentTemperatureC: 24,
        humidityPct: 65,
        rainProbabilityPct: 80,
        precipitationMm: 0,
        windSpeedKmh: 10,
        conditionLabel: 'Lluvia',
        retrievedAt: new Date().toISOString(),
        validUntil: new Date().toISOString(),
      },
    });

    expect(decision.action).toBe('pause');
  });
});
