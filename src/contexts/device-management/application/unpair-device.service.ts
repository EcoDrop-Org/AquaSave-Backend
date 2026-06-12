import { notFound } from '../../../shared/http/http-error.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';

export class UnpairDeviceService {
  constructor(private readonly devices: DeviceRepository) {}

  async execute(deviceId: string, accountId: string): Promise<void> {
    const device = await this.devices.findById(deviceId);
    if (!device || device.accountId !== accountId) {
      throw notFound('Device not found');
    }

    await this.devices.deleteById(deviceId);
  }
}
