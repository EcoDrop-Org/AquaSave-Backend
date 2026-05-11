import { unauthorized } from '../../../shared/http/http-error.js';
import { isSessionValid } from '../domain/app-session.js';
import type { SessionRepository } from '../domain/repositories/session-repository.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import { toPublicUser, type PublicUser } from '../domain/user.js';

export class GetCurrentUserQuery {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
  ) {}

  async execute(token: string): Promise<PublicUser> {
    const session = await this.sessions.findByToken(token);
    if (!session || !isSessionValid(session)) {
      throw unauthorized('Invalid or expired session');
    }

    const user = await this.users.findById(session.userId);
    if (!user || !user.isActive) {
      throw unauthorized('Invalid or expired session');
    }

    return toPublicUser(user);
  }
}
