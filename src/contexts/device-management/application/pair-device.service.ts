import { randomUUID } from 'node:crypto';

import { createGeoLocation, type GeoLocation } from '../domain/geo-location.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';
import type { Device } from '../domain/device.js';

export type PairDeviceInput = {
  accountId: string;
  name: string;
  location: GeoLocation;
  plantCount?: number;
  cropType?: string;
  firmwareVersion?: string;
};

export class PairDeviceService {
  constructor(private readonly devices: DeviceRepository) {}

  async execute(input: PairDeviceInput): Promise<Device> {
    const now = new Date().toISOString();
    const device: Device = {
      id: randomUUID(),
      accountId: input.accountId,
      name: input.name.trim(),
      location: createGeoLocation(input.location),
      status: 'offline',
      firmwareVersion: input.firmwareVersion,
      isActive: true,
      plantCount: input.plantCount ?? 1,
      cropType: input.cropType,
      valveState: 'closed',
      createdAt: now,
      updatedAt: now,
    };

    return this.devices.save(device);
  }
}
