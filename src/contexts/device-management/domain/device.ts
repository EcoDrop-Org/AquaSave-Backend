import type { DeviceStatus } from './device-status.js';
import type { GeoLocation } from './geo-location.js';
import type { SensorReading } from './sensor-reading.js';

export type ValveState = 'open' | 'closed';

export type Device = {
  id: string;
  accountId: string;
  name: string;
  location: GeoLocation;
  status: DeviceStatus;
  firmwareVersion?: string;
  isActive: boolean;
  plantCount: number;
  cropType?: string;
  valveState: ValveState;
  lastTelemetry?: SensorReading;
  createdAt: string;
  updatedAt: string;
};

export const touchDevice = (device: Device): Device => ({
  ...device,
  updatedAt: new Date().toISOString(),
});
