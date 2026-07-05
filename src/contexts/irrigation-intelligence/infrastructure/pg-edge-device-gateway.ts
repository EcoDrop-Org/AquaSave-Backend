import { randomUUID } from 'node:crypto';

import { notFound } from '../../../shared/http/http-error.js';
import type { PgClient } from '../../../shared/persistence/pg-client.js';
import type {
  EdgeCommand,
  EdgeCommandStatus,
  EdgeCommandType,
  EdgeDeviceGateway,
} from '../domain/ports/edge-device-gateway.js';

type EdgeCommandRow = {
  id: string;
  device_id: string;
  type: string;
  status: string;
  issued_at: Date;
  acknowledged_at: Date | null;
};

const rowToCommand = (row: EdgeCommandRow): EdgeCommand => ({
  id: row.id,
  deviceId: row.device_id,
  type: row.type as EdgeCommandType,
  status: row.status as EdgeCommandStatus,
  issuedAt: row.issued_at.toISOString(),
  acknowledgedAt: row.acknowledged_at?.toISOString(),
});

export class PgEdgeDeviceGateway implements EdgeDeviceGateway {
  constructor(private readonly sql: PgClient) {}

  queueOpenValve(deviceId: string): Promise<EdgeCommand> {
    return this.queue(deviceId, 'open-valve');
  }

  queueCloseValve(deviceId: string): Promise<EdgeCommand> {
    return this.queue(deviceId, 'close-valve');
  }

  queuePauseDevice(deviceId: string): Promise<EdgeCommand> {
    return this.queue(deviceId, 'pause-device');
  }

  queueResumeDevice(deviceId: string): Promise<EdgeCommand> {
    return this.queue(deviceId, 'resume-device');
  }

  async getPendingCommands(deviceId: string): Promise<EdgeCommand[]> {
    const rows = await this.sql<EdgeCommandRow[]>`
      SELECT * FROM edge_commands
      WHERE device_id = ${deviceId} AND status = 'pending'
      ORDER BY issued_at ASC
    `;
    return rows.map(rowToCommand);
  }

  async acknowledgeCommand(deviceId: string, commandId: string): Promise<EdgeCommand> {
    const rows = await this.sql<EdgeCommandRow[]>`
      UPDATE edge_commands
      SET status          = 'acknowledged',
          acknowledged_at = NOW()
      WHERE device_id = ${deviceId} AND id = ${commandId}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('Edge command not found');
    return rowToCommand(row);
  }

  private async queue(deviceId: string, type: EdgeCommandType): Promise<EdgeCommand> {
    const command: EdgeCommand = {
      id: randomUUID(),
      deviceId,
      type,
      status: 'pending',
      issuedAt: new Date().toISOString(),
    };
    await this.sql`
      INSERT INTO edge_commands (id, device_id, type, status, issued_at)
      VALUES (${command.id}, ${command.deviceId}, ${command.type}, ${command.status}, ${command.issuedAt})
    `;
    return command;
  }
}
