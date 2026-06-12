import type { PgClient } from '../../../shared/persistence/pg-client.js';
import type { AppSession } from '../domain/app-session.js';
import type { SessionRepository } from '../domain/repositories/session-repository.js';

type SessionRow = {
  id: string;
  token: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
};

const rowToSession = (row: SessionRow): AppSession => ({
  id: row.id,
  token: row.token,
  userId: row.user_id,
  createdAt: row.created_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
  revokedAt: row.revoked_at?.toISOString(),
});

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly sql: PgClient) {}

  async save(session: AppSession): Promise<AppSession> {
    await this.sql`
      INSERT INTO sessions (id, token, user_id, created_at, expires_at, revoked_at)
      VALUES (
        ${session.id},
        ${session.token},
        ${session.userId},
        ${session.createdAt},
        ${session.expiresAt},
        ${session.revokedAt ?? null}
      )
    `;
    return session;
  }

  async findByToken(token: string): Promise<AppSession | undefined> {
    const rows = await this.sql<SessionRow[]>`
      SELECT * FROM sessions WHERE token = ${token}
    `;
    const row = rows[0];
    return row ? rowToSession(row) : undefined;
  }

  async revokeByToken(token: string, revokedAt: string): Promise<AppSession | undefined> {
    const rows = await this.sql<SessionRow[]>`
      UPDATE sessions
      SET revoked_at = ${revokedAt}
      WHERE token = ${token}
      RETURNING *
    `;
    const row = rows[0];
    return row ? rowToSession(row) : undefined;
  }
}
