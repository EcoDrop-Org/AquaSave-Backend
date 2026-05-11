import { notFound } from '../../../shared/http/http-error.js';
import type { Device } from '../domain/device.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';

export class GetDeviceQuery {
  constructor(private readonly devices: DeviceRepository) {}

  async execute(deviceId: string, accountId?: string): Promise<Device> {
    const device = await this.devices.findById(deviceId);
    if (!device || (accountId && device.accountId !== accountId)) {
      throw notFound('Device not found');
    }
    return device;
  }
}
