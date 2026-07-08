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

// El ESP32 publica telemetria cada 5 s; si lleva mas de esto sin reportar,
// se considera desconectado aunque la BD todavia diga 'online'.
const ONLINE_STALE_MS = 90_000;

/**
 * Estado efectivo del dispositivo: 'online' SOLO con telemetria reciente.
 *
 * Sin esto, un dispositivo quedaba "En linea" para siempre cuando el ESP32
 * se apagaba sin que llegara el Last Will (edge caido en ese momento, o el
 * mensaje retenido "online" del topico de estado re-marcandolo al reconectar
 * el edge). Se aplica en las lecturas del repositorio, asi la app, el inicio
 * de riego y el scheduler ven el mismo estado real.
 */
export const withEffectiveStatus = (device: Device): Device => {
  if (device.status !== 'online') return device;

  const lastReportAt = device.lastTelemetry?.recordedAt;
  const stale =
    !lastReportAt || Date.now() - Date.parse(lastReportAt) > ONLINE_STALE_MS;

  return stale ? { ...device, status: 'offline' } : device;
};
