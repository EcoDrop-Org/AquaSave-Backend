import type { AppSession } from '../app-session.js';

export interface SessionRepository {
  save(session: AppSession): Promise<AppSession>;
  findByToken(token: string): Promise<AppSession | undefined>;
  revokeByToken(token: string, revokedAt: string): Promise<AppSession | undefined>;
}
