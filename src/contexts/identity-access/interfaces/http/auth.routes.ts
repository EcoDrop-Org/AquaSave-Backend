import { Router } from 'express';
import { z } from 'zod';

import type { AppServices } from '../../../../composition-root.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import {
  authMiddleware,
  extractBearerToken,
  requireAuth,
} from '../../../../shared/http/auth.middleware.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  profileType: z
    .enum(['horticultor-urbano', 'micro-agricultor-periurbano'])
    .optional(),
  spaceType: z.string().min(2).optional(),
  cropTypes: z.array(z.string().min(2)).optional(),
  locationCity: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createAuthRouter = (services: AppServices) => {
  const router = Router();

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const input = registerSchema.parse(req.body);
      const result = await services.identityAccess.registerUser.execute(input);
      res.status(201).json(result);
    }),
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const input = loginSchema.parse(req.body);
      const result = await services.identityAccess.loginUser.execute(input);
      res.json(result);
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      const token = extractBearerToken(req.header('authorization'));
      await services.identityAccess.logoutUser.execute(token);
      res.status(204).send();
    }),
  );

  router.get(
    '/me',
    authMiddleware(services),
    asyncHandler(async (req, res) => {
      const auth = requireAuth(req);
      res.json({ user: auth.user });
    }),
  );

  return router;
};
