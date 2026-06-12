import { notFound } from '../../../shared/http/http-error.js';
import { createGeoLocation, type GeoLocation } from '../domain/geo-location.js';
import { touchDevice, type Device } from '../domain/device.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';

export type UpdateDeviceInput = {
  deviceId: string;
  accountId: string;
  name?: string;
  location?: GeoLocation;
  plantCount?: number;
  cropType?: string | null;
};

export class UpdateDeviceService {
  constructor(private readonly devices: DeviceRepository) {}

  async execute(input: UpdateDeviceInput): Promise<Device> {
    const device = await this.devices.findById(input.deviceId);
    if (!device || device.accountId !== input.accountId) {
      throw notFound('Device not found');
    }

    const updated = touchDevice({
      ...device,
      name: input.name?.trim() ?? device.name,
      location: input.location
        ? createGeoLocation(input.location)
        : device.location,
      plantCount: input.plantCount ?? device.plantCount,
      cropType:
        input.cropType === null
          ? undefined
          : input.cropType ?? device.cropType,
    });

    return this.devices.update(updated);
  }
}
