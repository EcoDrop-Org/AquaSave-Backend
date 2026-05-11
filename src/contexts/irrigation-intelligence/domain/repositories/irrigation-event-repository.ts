import type { IrrigationEvent } from '../irrigation-event.js';

export interface IrrigationEventRepository {
  save(event: IrrigationEvent): Promise<IrrigationEvent>;
  findByDeviceId(deviceId: string): Promise<IrrigationEvent[]>;
  findRunningByDeviceId(deviceId: string): Promise<IrrigationEvent | undefined>;
  completeRunningEvent(
    deviceId: string,
    endedAt: string,
    litersConsumed: number,
  ): Promise<IrrigationEvent | undefined>;
}
