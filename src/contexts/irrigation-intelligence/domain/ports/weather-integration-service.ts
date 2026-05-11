import type { Device } from '../../../device-management/domain/device.js';
import type { WeatherForecast } from '../weather-forecast.js';

export interface WeatherIntegrationService {
  getForecastForDevice(device: Device): Promise<WeatherForecast>;
}
