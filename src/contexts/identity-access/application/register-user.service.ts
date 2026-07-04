import { randomUUID } from 'node:crypto';

import { conflict } from '../../../shared/http/http-error.js';
import { normalizeProfileType, type ProfileType } from '../domain/profile-type.js';
import type { User } from '../domain/user.js';
import { toPublicUser, type PublicUser } from '../domain/user.js';
import type { SessionRepository } from '../domain/repositories/session-repository.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import { JwtService } from '../domain/services/jwt-service.js';
import { PasswordHasher } from '../domain/services/password-hasher.js';

export type RegisterUserInput = {
  email: string;
  password: string;
  fullName: string;
  profileType?: ProfileType;
  spaceType?: string;
  cropTypes?: string[];
  locationCity?: string;
};

export type AuthResult = {
  user: PublicUser;
  token: string;
  expiresAt: string;
};

export class RegisterUserService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtService: JwtService,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessions: SessionRepository,
  ) {}

  async execute(input: RegisterUserInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw conflict('Email is already registered');
    }

    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash: await this.passwordHasher.hash(input.password),
      profile: {
        fullName: input.fullName.trim(),
        profileType: normalizeProfileType(input.profileType),
        spaceType: input.spaceType,
        cropTypes: input.cropTypes ?? [],
        locationCity: input.locationCity,
      },
      isActive: true,
      createdAt: now,
      lastLoginAt: now,
    };

    const saved = await this.users.save(user);
    const { token, expiresAt } = this.jwtService.sign(saved.id);

    // Registrar la sesion para poder revocarla en el logout.
    await this.sessions.save({
      id: randomUUID(),
      token,
      userId: saved.id,
      createdAt: now,
      expiresAt,
    });

    return {
      user: toPublicUser(saved),
      token,
      expiresAt,
    };
  }
}
