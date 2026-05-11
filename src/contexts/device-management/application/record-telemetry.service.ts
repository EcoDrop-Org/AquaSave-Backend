import { notFound } from '../../../shared/http/http-error.js';
import type { SensorReading } from '../domain/sensor-reading.js';
import { normalizeReading } from '../domain/sensor-reading.js';
import type { DeviceRepository } from '../domain/repositories/device-repository.js';
import type { Device } from '../domain/device.js';

export type RecordTelemetryInput = {
  deviceId: string;
  soilMoisturePct: number;
  temperatureC: number;
  flowRateLMin?: number;
  batteryPct?: number;
  recordedAt?: string;
};

export class RecordTelemetryService {
  constructor(private readonly devices: DeviceRepository) {}

  async execute(input: RecordTelemetryInput): Promise<Device> {
    const device = await this.devices.findById(input.deviceId);
    if (!device) {
      throw notFound('Device not found');
    }

    const reading: SensorReading = normalizeReading({
      deviceId: input.deviceId,
      soilMoisturePct: input.soilMoisturePct,
      temperatureC: input.temperatureC,
      flowRateLMin: input.flowRateLMin,
      batteryPct: input.batteryPct,
      recordedAt: input.recordedAt ?? new Date().toISOString(),
    });

    return this.devices.recordTelemetry(input.deviceId, reading);
  }
}
