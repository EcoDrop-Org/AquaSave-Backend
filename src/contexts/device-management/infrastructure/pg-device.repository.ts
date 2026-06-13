import { notFound } from '../../../shared/http/http-error.js';
import type { PgClient } from '../../../shared/persistence/pg-client.js';
import type { Device, ValveState } from '../domain/device.js';
import type { DeviceStatus } from '../domain/device-status.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';
import type { SensorReading } from '../domain/sensor-reading.js';

type DeviceRow = {
  id: string;
  account_id: string;
  name: string;
  location_label: string;
  location_latitude: number | null;
  location_longitude: number | null;
  status: string;
  firmware_version: string | null;
  is_active: boolean;
  plant_count: number;
  crop_type: string | null;
  valve_state: string;
  last_telemetry: SensorReading | null;
  created_at: Date;
  updated_at: Date;
};

const rowToDevice = (row: DeviceRow): Device => ({
  id: row.id,
  accountId: row.account_id,
  name: row.name,
  location: {
    label: row.location_label,
    latitude: row.location_latitude ?? undefined,
    longitude: row.location_longitude ?? undefined,
  },
  status: row.status as DeviceStatus,
  firmwareVersion: row.firmware_version ?? undefined,
  isActive: row.is_active,
  plantCount: row.plant_count,
  cropType: row.crop_type ?? undefined,
  valveState: row.valve_state as ValveState,
  lastTelemetry: row.last_telemetry ?? undefined,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export class PgDeviceRepository implements DeviceRepository {
  constructor(private readonly sql: PgClient) {}

  async findById(deviceId: string): Promise<Device | undefined> {
    const rows = await this.sql<DeviceRow[]>`
      SELECT * FROM devices WHERE id = ${deviceId}
    `;
    const row = rows[0];
    return row ? rowToDevice(row) : undefined;
  }

  async findByAccountId(accountId: string): Promise<Device[]> {
    const rows = await this.sql<DeviceRow[]>`
      SELECT * FROM devices WHERE account_id = ${accountId}
    `;
    return rows.map(rowToDevice);
  }

  async save(device: Device): Promise<Device> {
    await this.sql`
      INSERT INTO devices (
        id, account_id, name,
        location_label, location_latitude, location_longitude,
        status, firmware_version, is_active, plant_count, crop_type,
        valve_state, last_telemetry, created_at, updated_at
      ) VALUES (
        ${device.id},
        ${device.accountId},
        ${device.name},
        ${device.location.label},
        ${device.location.latitude ?? null},
        ${device.location.longitude ?? null},
        ${device.status},
        ${device.firmwareVersion ?? null},
        ${device.isActive},
        ${device.plantCount},
        ${device.cropType ?? null},
        ${device.valveState},
        ${device.lastTelemetry ? this.sql.json(device.lastTelemetry) : null},
        ${device.createdAt},
        ${device.updatedAt}
      )
    `;
    return device;
  }

  async update(device: Device): Promise<Device> {
    const rows = await this.sql<DeviceRow[]>`
      UPDATE devices
      SET name               = ${device.name},
          location_label     = ${device.location.label},
          location_latitude  = ${device.location.latitude ?? null},
          location_longitude = ${device.location.longitude ?? null},
          status             = ${device.status},
          firmware_version   = ${device.firmwareVersion ?? null},
          is_active          = ${device.isActive},
          plant_count        = ${device.plantCount},
          crop_type          = ${device.cropType ?? null},
          valve_state        = ${device.valveState},
          last_telemetry     = ${device.lastTelemetry ? this.sql.json(device.lastTelemetry) : null},
          updated_at         = NOW()
      WHERE id = ${device.id}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('Device not found');
    return rowToDevice(row);
  }

  async deleteById(deviceId: string): Promise<void> {
    await this.sql`DELETE FROM irrigation_events WHERE device_id = ${deviceId}`;
    await this.sql`DELETE FROM edge_commands WHERE device_id = ${deviceId}`;
    await this.sql`DELETE FROM devices WHERE id = ${deviceId}`;
  }

  async updateStatus(deviceId: string, status: DeviceStatus, firmwareVersion?: string): Promise<Device> {
    const rows = await this.sql<DeviceRow[]>`
      UPDATE devices
      SET status           = ${status},
          firmware_version = COALESCE(${firmwareVersion ?? null}, firmware_version),
          updated_at       = NOW()
      WHERE id = ${deviceId}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('Device not found');
    return rowToDevice(row);
  }

  async recordTelemetry(deviceId: string, reading: SensorReading): Promise<Device> {
    const rows = await this.sql<DeviceRow[]>`
      UPDATE devices
      SET status         = 'online',
          last_telemetry = ${this.sql.json(reading)},
          updated_at     = NOW()
      WHERE id = ${deviceId}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('Device not found');
    return rowToDevice(row);
  }

  async updateValveState(deviceId: string, valveState: ValveState): Promise<Device> {
    const rows = await this.sql<DeviceRow[]>`
      UPDATE devices
      SET valve_state = ${valveState},
          updated_at  = NOW()
      WHERE id = ${deviceId}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('Device not found');
    return rowToDevice(row);
  }

  async getSettings(deviceId: string): Promise<Record<string, unknown>> {
    const rows = await this.sql<{ settings: Record<string, unknown> }[]>`
      SELECT settings FROM device_settings WHERE device_id = ${deviceId}
    `;
    return rows[0]?.settings ?? {};
  }

  async putSettings(deviceId: string, settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.sql`
      INSERT INTO device_settings (device_id, settings, updated_at)
      VALUES (${deviceId}, ${this.sql.json(settings)}, NOW())
      ON CONFLICT (device_id)
      DO UPDATE SET settings = ${this.sql.json(settings)}, updated_at = NOW()
    `;
    return settings;
  }
}
