import type { IrrigationEvent } from '../irrigation-event.js';

export interface IrrigationEventRepository {
  save(event: IrrigationEvent): Promise<IrrigationEvent>;
  findByDeviceId(deviceId: string): Promise<IrrigationEvent[]>;
  findRunningByDeviceId(deviceId: string): Promise<IrrigationEvent | undefined>;
  /** Todos los eventos en curso (para el scheduler de riego programado). */
  findAllRunning(): Promise<IrrigationEvent[]>;
  completeRunningEvent(
    deviceId: string,
    endedAt: string,
    litersConsumed: number,
  ): Promise<IrrigationEvent | undefined>;
}
