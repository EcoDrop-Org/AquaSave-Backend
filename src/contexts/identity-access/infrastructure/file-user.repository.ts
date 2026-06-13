import { join } from 'node:path';

import { notFound } from '../../../shared/http/http-error.js';
import { JsonStore } from '../../../shared/persistence/json-store.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import type { User } from '../domain/user.js';

type UsersFile = {
  users: User[];
};

export class FileUserRepository implements UserRepository {
  private readonly store: JsonStore<UsersFile>;

  constructor(dataDir: string) {
    this.store = new JsonStore<UsersFile>(join(dataDir, 'users.json'), {
      users: [],
    });
  }

  async findById(userId: string): Promise<User | undefined> {
    const data = await this.store.read();
    return data.users.find((user) => user.id === userId);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const data = await this.store.read();
    return data.users.find((user) => user.email === email.toLowerCase());
  }

  async save(user: User): Promise<User> {
    const data = await this.store.read();
    data.users.push(user);
    await this.store.write(data);
    return user;
  }

  async updateLastLogin(userId: string, loggedAt: string): Promise<User> {
    const data = await this.store.read();
    const index = data.users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw notFound('User not found');
    }

    const current = data.users[index];
    if (!current) {
      throw notFound('User not found');
    }

    const updated: User = {
      ...current,
      lastLoginAt: loggedAt,
    };
    data.users[index] = updated;
    await this.store.write(data);
    return updated;
  }

  async updateProfile(userId: string, fields: { fullName?: string; locationCity?: string }): Promise<User> {
    const data = await this.store.read();
    const index = data.users.findIndex((u) => u.id === userId);
    if (index < 0) throw notFound('User not found');
    const current = data.users[index];
    if (!current) throw notFound('User not found');
    const updated: User = {
      ...current,
      profile: {
        ...current.profile,
        fullName: fields.fullName ?? current.profile.fullName,
        locationCity: fields.locationCity ?? current.profile.locationCity,
      },
    };
    data.users[index] = updated;
    await this.store.write(data);
    return updated;
  }

  async updatePassword(userId: string, newHash: string): Promise<void> {
    const data = await this.store.read();
    const index = data.users.findIndex((u) => u.id === userId);
    if (index < 0) throw notFound('User not found');
    const current = data.users[index];
    if (!current) throw notFound('User not found');
    data.users[index] = { ...current, passwordHash: newHash };
    await this.store.write(data);
  }
}
