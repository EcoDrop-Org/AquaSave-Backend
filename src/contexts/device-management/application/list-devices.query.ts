import type { Device } from '../domain/device.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';

export class ListDevicesQuery {
  constructor(private readonly devices: DeviceRepository) {}

  execute(accountId: string): Promise<Device[]> {
    return this.devices.findByAccountId(accountId);
  }
}
