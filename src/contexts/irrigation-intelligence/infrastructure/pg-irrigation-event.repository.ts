import type { PgClient } from '../../../shared/persistence/pg-client.js';
import type {
  IrrigationEvent,
  IrrigationEventStatus,
  IrrigationTriggerType,
} from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';

type IrrigationEventRow = {
  id: string;
  device_id: string;
  started_at: Date;
  ended_at: Date | null;
  liters_consumed: number;
  trigger_type: string;
  status: string;
  was_skipped: boolean;
  skip_reason: string | null;
  command_id: string | null;
};

const rowToEvent = (row: IrrigationEventRow): IrrigationEvent => ({
  id: row.id,
  deviceId: row.device_id,
  startedAt: row.started_at.toISOString(),
  endedAt: row.ended_at?.toISOString(),
  litersConsumed: row.liters_consumed,
  triggerType: row.trigger_type as IrrigationTriggerType,
  status: row.status as IrrigationEventStatus,
  wasSkipped: row.was_skipped,
  skipReason: row.skip_reason ?? undefined,
  commandId: row.command_id ?? undefined,
});

export class PgIrrigationEventRepository implements IrrigationEventRepository {
  constructor(private readonly sql: PgClient) {}

  async save(event: IrrigationEvent): Promise<IrrigationEvent> {
    await this.sql`
      INSERT INTO irrigation_events (
        id, device_id, started_at, ended_at, liters_consumed,
        trigger_type, status, was_skipped, skip_reason, command_id
      ) VALUES (
        ${event.id},
        ${event.deviceId},
        ${event.startedAt},
        ${event.endedAt ?? null},
        ${event.litersConsumed},
        ${event.triggerType},
        ${event.status},
        ${event.wasSkipped},
        ${event.skipReason ?? null},
        ${event.commandId ?? null}
      )
    `;
    return event;
  }

  async findByDeviceId(deviceId: string): Promise<IrrigationEvent[]> {
    const rows = await this.sql<IrrigationEventRow[]>`
      SELECT * FROM irrigation_events
      WHERE device_id = ${deviceId}
      ORDER BY started_at DESC
    `;
    return rows.map(rowToEvent);
  }

  async findRunningByDeviceId(deviceId: string): Promise<IrrigationEvent | undefined> {
    const rows = await this.sql<IrrigationEventRow[]>`
      SELECT * FROM irrigation_events
      WHERE device_id = ${deviceId} AND status = 'running'
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToEvent(row) : undefined;
  }

  async completeRunningEvent(
    deviceId: string,
    endedAt: string,
    litersConsumed: number,
  ): Promise<IrrigationEvent | undefined> {
    const rows = await this.sql<IrrigationEventRow[]>`
      UPDATE irrigation_events
      SET ended_at        = ${endedAt},
          liters_consumed = ${litersConsumed},
          status          = 'completed'
      WHERE device_id = ${deviceId} AND status = 'running'
      RETURNING *
    `;
    const row = rows[0];
    return row ? rowToEvent(row) : undefined;
  }
}
