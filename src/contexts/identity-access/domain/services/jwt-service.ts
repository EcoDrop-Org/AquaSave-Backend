import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { unauthorized } from '../../../../shared/http/http-error.js';

type JwtPayload = {
  sub: string;
  jti: string;
};

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export class JwtService {
  constructor(private readonly secret: string) {}

  sign(userId: string): { token: string; expiresAt: string } {
    const token = jwt.sign(
      { sub: userId, jti: randomUUID() },
      this.secret,
      { expiresIn: TTL_SECONDS },
    );

    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
    return { token, expiresAt };
  }

  verify(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secret) as JwtPayload;
      return { userId: payload.sub };
    } catch {
      throw unauthorized('Invalid or expired session');
    }
  }
}
