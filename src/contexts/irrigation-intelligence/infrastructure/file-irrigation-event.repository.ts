import { join } from 'node:path';

import { JsonStore } from '../../../shared/persistence/json-store.js';
import type { IrrigationEvent } from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';

type IrrigationEventsFile = {
  events: IrrigationEvent[];
};

export class FileIrrigationEventRepository
  implements IrrigationEventRepository
{
  private readonly store: JsonStore<IrrigationEventsFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore<IrrigationEventsFile>(
      join(dataDir, 'irrigation-events.json'),
      { events: [] },
    );
  }

  async save(event: IrrigationEvent): Promise<IrrigationEvent> {
    const data = await this.store.read();
    data.events.push(event);
    await this.store.write(data);
    return event;
  }

  async findByDeviceId(deviceId: string): Promise<IrrigationEvent[]> {
    const data = await this.store.read();
    return data.events
      .filter((event) => event.deviceId === deviceId)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }

  async findRunningByDeviceId(
    deviceId: string,
  ): Promise<IrrigationEvent | undefined> {
    const data = await this.store.read();
    return data.events.find(
      (event) => event.deviceId === deviceId && event.status === 'running',
    );
  }

  async findAllRunning(): Promise<IrrigationEvent[]> {
    const data = await this.store.read();
    return data.events.filter((event) => event.status === 'running');
  }

  async completeRunningEvent(
    deviceId: string,
    endedAt: string,
    litersConsumed: number,
  ): Promise<IrrigationEvent | undefined> {
    const data = await this.store.read();
    const index = data.events.findIndex(
      (event) => event.deviceId === deviceId && event.status === 'running',
    );
    if (index < 0) {
      return undefined;
    }

    const current = data.events[index];
    if (!current) {
      return undefined;
    }

    const completed: IrrigationEvent = {
      ...current,
      endedAt,
      litersConsumed,
      status: 'completed',
    };

    data.events[index] = completed;
    await this.store.write(data);
    return completed;
  }
}
