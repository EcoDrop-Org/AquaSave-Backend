import { notFound } from '../../../shared/http/http-error.js';
import type { PgClient } from '../../../shared/persistence/pg-client.js';
import type { ProfileType } from '../domain/profile-type.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import type { User } from '../domain/user.js';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  profile_type: string;
  space_type: string | null;
  crop_types: string[];
  location_city: string | null;
  is_active: boolean;
  created_at: Date;
  last_login_at: Date | null;
};

const rowToUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  profile: {
    fullName: row.full_name,
    profileType: row.profile_type as ProfileType,
    spaceType: row.space_type ?? undefined,
    cropTypes: row.crop_types,
    locationCity: row.location_city ?? undefined,
  },
  isActive: row.is_active,
  createdAt: row.created_at.toISOString(),
  lastLoginAt: row.last_login_at?.toISOString(),
});

export class PgUserRepository implements UserRepository {
  constructor(private readonly sql: PgClient) {}

  async findById(userId: string): Promise<User | undefined> {
    const rows = await this.sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${userId}
    `;
    const row = rows[0];
    return row ? rowToUser(row) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.sql<UserRow[]>`
      SELECT * FROM users WHERE email = ${email.toLowerCase()}
    `;
    const row = rows[0];
    return row ? rowToUser(row) : undefined;
  }

  async save(user: User): Promise<User> {
    await this.sql`
      INSERT INTO users (
        id, email, password_hash, full_name, profile_type,
        space_type, crop_types, location_city, is_active,
        created_at, last_login_at
      ) VALUES (
        ${user.id},
        ${user.email},
        ${user.passwordHash},
        ${user.profile.fullName},
        ${user.profile.profileType},
        ${user.profile.spaceType ?? null},
        ${this.sql.array(user.profile.cropTypes)},
        ${user.profile.locationCity ?? null},
        ${user.isActive},
        ${user.createdAt},
        ${user.lastLoginAt ?? null}
      )
    `;
    return user;
  }

  async updateLastLogin(userId: string, loggedAt: string): Promise<User> {
    const rows = await this.sql<UserRow[]>`
      UPDATE users
      SET last_login_at = ${loggedAt}
      WHERE id = ${userId}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('User not found');
    return rowToUser(row);
  }

  async updateProfile(
    userId: string,
    fields: { fullName?: string; locationCity?: string },
  ): Promise<User> {
    const rows = await this.sql<UserRow[]>`
      UPDATE users
      SET
        full_name     = COALESCE(${fields.fullName ?? null}, full_name),
        location_city = COALESCE(${fields.locationCity ?? null}, location_city)
      WHERE id = ${userId}
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw notFound('User not found');
    return rowToUser(row);
  }

  async updatePassword(userId: string, newHash: string): Promise<void> {
    const rows = await this.sql<{ id: string }[]>`
      UPDATE users
      SET password_hash = ${newHash}
      WHERE id = ${userId}
      RETURNING id
    `;
    if (!rows[0]) throw notFound('User not found');
  }
}
