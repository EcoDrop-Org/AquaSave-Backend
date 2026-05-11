import { randomBytes, randomUUID } from 'node:crypto';

import type { AppSession } from '../domain/app-session.js';

const sessionTtlDays = 30;

export const createSession = (userId: string): AppSession => {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + sessionTtlDays);

  return {
    id: randomUUID(),
    token: randomBytes(32).toString('hex'),
    userId,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};
