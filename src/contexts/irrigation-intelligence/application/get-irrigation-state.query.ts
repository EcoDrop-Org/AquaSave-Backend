import { notFound } from '../../../shared/http/http-error.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import type { IrrigationEvent } from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';

export type IrrigationState = {
  deviceId: string;
  valveState: 'open' | 'closed';
  isRunning: boolean;
  elapsedSeconds: number;
  runningEvent?: IrrigationEvent;
};

export class GetIrrigationStateQuery {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly events: IrrigationEventRepository,
  ) {}

  async execute(deviceId: string, accountId?: string): Promise<IrrigationState> {
    const device = await this.devices.findById(deviceId);
    if (!device || (accountId && device.accountId !== accountId)) {
      throw notFound('Device not found');
    }

    const runningEvent = await this.events.findRunningByDeviceId(deviceId);
    const elapsedSeconds = runningEvent
      ? Math.max(0, Math.floor((Date.now() - Date.parse(runningEvent.startedAt)) / 1000))
      : 0;

    return {
      deviceId,
      valveState: device.valveState,
      isRunning: Boolean(runningEvent),
      elapsedSeconds,
      runningEvent,
    };
  }
}
