import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { notFound } from '../../../shared/http/http-error.js';
import { JsonStore } from '../../../shared/persistence/json-store.js';
import type {
  EdgeCommand,
  EdgeCommandType,
  EdgeDeviceGateway,
} from '../domain/ports/edge-device-gateway.js';

type EdgeCommandsFile = {
  commands: EdgeCommand[];
};

export class FileEdgeDeviceGateway implements EdgeDeviceGateway {
  private readonly store: JsonStore<EdgeCommandsFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore<EdgeCommandsFile>(
      join(dataDir, 'edge-commands.json'),
      { commands: [] },
    );
  }

  queueOpenValve(deviceId: string): Promise<EdgeCommand> {
    return this.queue(deviceId, 'open-valve');
  }

  queueCloseValve(deviceId: string): Promise<EdgeCommand> {
    return this.queue(deviceId, 'close-valve');
  }

  async getPendingCommands(deviceId: string): Promise<EdgeCommand[]> {
    const data = await this.store.read();
    return data.commands.filter(
      (command) =>
        command.deviceId === deviceId && command.status === 'pending',
    );
  }

  async acknowledgeCommand(
    deviceId: string,
    commandId: string,
  ): Promise<EdgeCommand> {
    const data = await this.store.read();
    const index = data.commands.findIndex(
      (command) => command.deviceId === deviceId && command.id === commandId,
    );
    if (index < 0) {
      throw notFound('Edge command not found');
    }

    const current = data.commands[index];
    if (!current) {
      throw notFound('Edge command not found');
    }

    const acknowledged: EdgeCommand = {
      ...current,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    };

    data.commands[index] = acknowledged;
    await this.store.write(data);
    return acknowledged;
  }

  private async queue(
    deviceId: string,
    type: EdgeCommandType,
  ): Promise<EdgeCommand> {
    const data = await this.store.read();
    const command: EdgeCommand = {
      id: randomUUID(),
      deviceId,
      type,
      status: 'pending',
      issuedAt: new Date().toISOString(),
    };

    data.commands.push(command);
    await this.store.write(data);
    return command;
  }
}
