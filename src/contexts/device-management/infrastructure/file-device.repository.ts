import { join } from 'node:path';

import { notFound } from '../../../shared/http/http-error.js';
import { JsonStore } from '../../../shared/persistence/json-store.js';
import type { Device, ValveState } from '../domain/device.js';
import { touchDevice } from '../domain/device.js';
import type { DeviceStatus } from '../domain/device-status.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';
import type { SensorReading } from '../domain/sensor-reading.js';

type DeviceFile = {
  devices: Device[];
};

export class FileDeviceRepository implements DeviceRepository {
  private readonly store: JsonStore<DeviceFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore<DeviceFile>(join(dataDir, 'devices.json'), {
      devices: [],
    });
  }

  async findById(deviceId: string): Promise<Device | undefined> {
    const data = await this.store.read();
    return data.devices.find((device) => device.id === deviceId);
  }

  async findByAccountId(accountId: string): Promise<Device[]> {
    const data = await this.store.read();
    return data.devices.filter((device) => device.accountId === accountId);
  }

  async save(device: Device): Promise<Device> {
    const data = await this.store.read();
    data.devices.push(device);
    await this.store.write(data);
    return device;
  }

  async updateStatus(
    deviceId: string,
    status: DeviceStatus,
    firmwareVersion?: string,
  ): Promise<Device> {
    return this.update(deviceId, (device) => ({
      ...device,
      status,
      firmwareVersion: firmwareVersion ?? device.firmwareVersion,
    }));
  }

  async recordTelemetry(
    deviceId: string,
    reading: SensorReading,
  ): Promise<Device> {
    return this.update(deviceId, (device) => ({
      ...device,
      status: 'online',
      lastTelemetry: reading,
    }));
  }

  async updateValveState(
    deviceId: string,
    valveState: ValveState,
  ): Promise<Device> {
    return this.update(deviceId, (device) => ({
      ...device,
      valveState,
    }));
  }

  private async update(
    deviceId: string,
    updateFn: (device: Device) => Device,
  ): Promise<Device> {
    const data = await this.store.read();
    const index = data.devices.findIndex((device) => device.id === deviceId);
    if (index < 0) {
      throw notFound('Device not found');
    }

    const current = data.devices[index];
    if (!current) {
      throw notFound('Device not found');
    }

    const updated = touchDevice(updateFn(current));
    data.devices[index] = updated;
    await this.store.write(data);
    return updated;
  }
}
