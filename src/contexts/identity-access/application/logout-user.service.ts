import type { SessionRepository } from '../domain/repositories/session-repository.js';

export class LogoutUserService {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(token: string): Promise<void> {
    // Revoca la sesion en el servidor; si el token no existe, no falla
    // (el cliente igual descarta su copia).
    await this.sessions.revokeByToken(token, new Date().toISOString());
  }
}
