import type { Device, ValveState } from '../device.js';
import type { DeviceStatus } from '../device-status.js';
import type { SensorReading } from '../sensor-reading.js';

export interface DeviceRepository {
  findById(deviceId: string): Promise<Device | undefined>;
  findByAccountId(accountId: string): Promise<Device[]>;
  save(device: Device): Promise<Device>;
  update(device: Device): Promise<Device>;
  deleteById(deviceId: string): Promise<void>;
  updateStatus(
    deviceId: string,
    status: DeviceStatus,
    firmwareVersion?: string,
  ): Promise<Device>;
  recordTelemetry(deviceId: string, reading: SensorReading): Promise<Device>;
  updateValveState(deviceId: string, valveState: ValveState): Promise<Device>;
  getSettings(deviceId: string): Promise<Record<string, unknown>>;
  putSettings(deviceId: string, settings: Record<string, unknown>): Promise<Record<string, unknown>>;
}
