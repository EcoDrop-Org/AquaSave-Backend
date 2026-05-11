import type { User } from '../user.js';

export interface UserRepository {
  findById(userId: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  save(user: User): Promise<User>;
  updateLastLogin(userId: string, loggedAt: string): Promise<User>;
}
