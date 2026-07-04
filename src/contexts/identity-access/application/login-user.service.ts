import { randomUUID } from 'node:crypto';

import { unauthorized } from '../../../shared/http/http-error.js';
import type { SessionRepository } from '../domain/repositories/session-repository.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import { JwtService } from '../domain/services/jwt-service.js';
import { PasswordHasher } from '../domain/services/password-hasher.js';
import { toPublicUser, type PublicUser } from '../domain/user.js';

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
    private readonly jwtService: JwtService,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessions: SessionRepository,
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

    const { token, expiresAt } = this.jwtService.sign(user.id);

    // Registrar la sesion para poder revocarla en el logout.
    await this.sessions.save({
      id: randomUUID(),
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt,
    });

    return {
      user: toPublicUser(updatedUser),
      token,
      expiresAt,
    };
  }
}
