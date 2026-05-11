import type { SensorReading } from '../../../device-management/domain/sensor-reading.js';
import type { MoistureThreshold } from '../moisture-threshold.js';
import type { WeatherForecast } from '../weather-forecast.js';
import { shouldPauseForWeather } from '../weather-forecast.js';

export type IrrigationDecision =
  | {
      action: 'start';
      reason: string;
    }
  | {
      action: 'pause';
      reason: string;
    }
  | {
      action: 'keep-stopped';
      reason: string;
    };

export class IrrigationDecisionService {
  evaluate(input: {
    telemetry?: SensorReading;
    threshold: MoistureThreshold;
    forecast?: WeatherForecast;
  }): IrrigationDecision {
    if (input.forecast && shouldPauseForWeather(input.forecast)) {
      return {
        action: 'pause',
        reason: 'Rain probability or precipitation is high',
      };
    }

    if (!input.telemetry) {
      return {
        action: 'keep-stopped',
        reason: 'No telemetry available',
      };
    }

    if (input.telemetry.soilMoisturePct < input.threshold.minMoisture) {
      return {
        action: 'start',
        reason: 'Soil moisture is below configured minimum',
      };
    }

    return {
      action: 'keep-stopped',
      reason: 'Soil moisture is inside the safe range',
    };
  }
}
