import { join } from 'node:path';

import { JsonStore } from '../../../shared/persistence/json-store.js';
import type { AppSession } from '../domain/app-session.js';
import type { SessionRepository } from '../domain/repositories/session-repository.js';

type SessionsFile = {
  sessions: AppSession[];
};

export class FileSessionRepository implements SessionRepository {
  private readonly store: JsonStore<SessionsFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore<SessionsFile>(join(dataDir, 'sessions.json'), {
      sessions: [],
    });
  }

  async save(session: AppSession): Promise<AppSession> {
    const data = await this.store.read();
    data.sessions.push(session);
    await this.store.write(data);
    return session;
  }

  async findByToken(token: string): Promise<AppSession | undefined> {
    const data = await this.store.read();
    return data.sessions.find((session) => session.token === token);
  }

  async revokeByToken(
    token: string,
    revokedAt: string,
  ): Promise<AppSession | undefined> {
    const data = await this.store.read();
    const index = data.sessions.findIndex((session) => session.token === token);
    if (index < 0) {
      return undefined;
    }

    const current = data.sessions[index];
    if (!current) {
      return undefined;
    }

    const revoked: AppSession = {
      ...current,
      revokedAt,
    };

    data.sessions[index] = revoked;
    await this.store.write(data);
    return revoked;
  }
}
