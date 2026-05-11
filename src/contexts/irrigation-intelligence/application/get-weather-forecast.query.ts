import { notFound } from '../../../shared/http/http-error.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import type { WeatherForecast } from '../domain/weather-forecast.js';
import type { WeatherIntegrationService } from '../domain/ports/weather-integration-service.js';

export class GetWeatherForecastQuery {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly weather: WeatherIntegrationService,
  ) {}

  async execute(deviceId: string, accountId?: string): Promise<WeatherForecast> {
    const device = await this.devices.findById(deviceId);
    if (!device || (accountId && device.accountId !== accountId)) {
      throw notFound('Device not found');
    }

    return this.weather.getForecastForDevice(device);
  }
}
