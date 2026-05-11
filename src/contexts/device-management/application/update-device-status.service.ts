import { notFound } from '../../../shared/http/http-error.js';
import type { Device } from '../domain/device.js';
import type { DeviceStatus } from '../domain/device-status.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';

export type UpdateDeviceStatusInput = {
  deviceId: string;
  status: DeviceStatus;
  firmwareVersion?: string;
};

export class UpdateDeviceStatusService {
  constructor(private readonly devices: DeviceRepository) {}

  async execute(input: UpdateDeviceStatusInput): Promise<Device> {
    const device = await this.devices.findById(input.deviceId);
    if (!device) {
      throw notFound('Device not found');
    }

    return this.devices.updateStatus(
      input.deviceId,
      input.status,
      input.firmwareVersion,
    );
  }
}
