import { randomUUID } from 'node:crypto';

import { badRequest, conflict, notFound } from '../../../shared/http/http-error.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';
import type { EdgeDeviceGateway } from '../domain/ports/edge-device-gateway.js';
import type { IrrigationEvent } from '../domain/irrigation-event.js';

export class StartIrrigationService {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly events: IrrigationEventRepository,
    private readonly edgeGateway: EdgeDeviceGateway,
  ) {}

  async execute(deviceId: string, accountId?: string): Promise<IrrigationEvent> {
    const device = await this.devices.findById(deviceId);
    if (!device || (accountId && device.accountId !== accountId)) {
      throw notFound('Device not found');
    }
    if (device.status !== 'online') {
      throw badRequest('Device is not online');
    }

    const running = await this.events.findRunningByDeviceId(deviceId);
    if (running) {
      throw conflict('Irrigation is already running for this device');
    }

    const command = await this.edgeGateway.queueOpenValve(deviceId);
    await this.devices.updateValveState(deviceId, 'open');

    const event: IrrigationEvent = {
      id: randomUUID(),
      deviceId,
      startedAt: new Date().toISOString(),
      litersConsumed: 0,
      triggerType: 'manual',
      status: 'running',
      wasSkipped: false,
      commandId: command.id,
      // Snapshot de las condiciones al iniciar (para el historial).
      soilMoisturePct: device.lastTelemetry?.soilMoisturePct,
      temperatureC: device.lastTelemetry?.temperatureC,
    };

    return this.events.save(event);
  }
}
