import type { SessionRepository } from '../domain/repositories/session-repository.js';

export class LogoutUserService {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(token: string): Promise<void> {
    await this.sessions.revokeByToken(token, new Date().toISOString());
  }
}
