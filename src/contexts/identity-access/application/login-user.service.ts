import { badRequest, unauthorized } from '../../../shared/http/http-error.js';
import { isSessionValid } from '../domain/app-session.js';
import type { SessionRepository } from '../domain/repositories/session-repository.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import { PasswordHasher } from '../domain/services/password-hasher.js';
import { toPublicUser, type PublicUser } from '../domain/user.js';
import { createSession } from './session-factory.js';

export type LoginUserInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  user: PublicUser;
  token: string;
  expiresAt: string;
};

export class LoginUserService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      throw unauthorized('Invalid email or password');
    }

    const validPassword = await this.passwordHasher.verify(
      input.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw unauthorized('Invalid email or password');
    }

    const updatedUser = await this.users.updateLastLogin(
      user.id,
      new Date().toISOString(),
    );
    const session = await this.sessions.save(createSession(user.id));
    if (!isSessionValid(session)) {
      throw badRequest('Could not start session');
    }

    return {
      user: toPublicUser(updatedUser),
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }
}
