import { badRequest, notFound } from '../../../shared/http/http-error.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import type { EdgeDeviceGateway } from '../domain/ports/edge-device-gateway.js';
import type { IrrigationEvent } from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';

export class StopIrrigationService {
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

    const running = await this.events.findRunningByDeviceId(deviceId);
    if (!running) {
      throw badRequest('Irrigation is not running for this device');
    }

    await this.edgeGateway.queueCloseValve(deviceId);
    await this.devices.updateValveState(deviceId, 'closed');

    const endedAt = new Date().toISOString();
    const litersConsumed = calculateLitersConsumed(
      running.startedAt,
      endedAt,
      device.lastTelemetry?.flowRateLMin,
    );

    const completed = await this.events.completeRunningEvent(
      deviceId,
      endedAt,
      litersConsumed,
    );

    if (!completed) {
      throw badRequest('Irrigation is not running for this device');
    }

    return completed;
  }
}

const calculateLitersConsumed = (
  startedAt: string,
  endedAt: string,
  flowRateLMin = 0,
): number => {
  const durationMs = Date.parse(endedAt) - Date.parse(startedAt);
  const durationMinutes = Math.max(durationMs, 0) / 1000 / 60;
  return Number((durationMinutes * flowRateLMin).toFixed(2));
};
