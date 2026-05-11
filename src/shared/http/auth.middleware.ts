import type { RequestHandler } from 'express';

import type { AppServices } from '../../composition-root.js';
import { unauthorized } from './http-error.js';

export const authMiddleware = (services: AppServices): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const header = req.header('authorization');
      const token = extractBearerToken(header);
      const auth = await services.identityAccess.authenticateSession.execute(
        token,
      );

      req.auth = {
        ...auth,
        accountId: auth.user.id,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAuth = (req: Express.Request) => {
  if (!req.auth) {
    throw unauthorized('Authentication required');
  }
  return req.auth;
};

export const extractBearerToken = (header?: string): string => {
  if (!header) {
    throw unauthorized('Authentication required');
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw unauthorized('Invalid authorization header');
  }

  return token;
};
