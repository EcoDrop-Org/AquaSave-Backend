import type { IrrigationEvent } from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';
import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import { notFound } from '../../../shared/http/http-error.js';

export class ListIrrigationEventsQuery {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly events: IrrigationEventRepository,
  ) {}

  async execute(deviceId: string, accountId?: string): Promise<IrrigationEvent[]> {
    const device = await this.devices.findById(deviceId);
    if (!device || (accountId && device.accountId !== accountId)) {
      throw notFound('Device not found');
    }
    return this.events.findByDeviceId(deviceId);
  }
}
