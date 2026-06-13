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

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  locationCity: z.string().min(2).optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
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

  router.patch(
    '/me',
    authMiddleware(services),
    asyncHandler(async (req, res) => {
      const auth = requireAuth(req);
      const input = updateProfileSchema.parse(req.body);
      const updated = await services.identityAccess.userRepository.updateProfile(
        auth.user.id,
        input,
      );
      const { passwordHash: _, ...publicUser } = updated;
      res.json({ user: publicUser });
    }),
  );

  router.post(
    '/change-password',
    authMiddleware(services),
    asyncHandler(async (req, res) => {
      const auth = requireAuth(req);
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const user = await services.identityAccess.userRepository.findById(auth.user.id);
      if (!user) {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      const valid = await services.identityAccess.passwordHasher.verify(
        currentPassword,
        user.passwordHash,
      );
      if (!valid) {
        res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        return;
      }

      const newHash = await services.identityAccess.passwordHasher.hash(newPassword);
      await services.identityAccess.userRepository.updatePassword(auth.user.id, newHash);

      res.status(204).send();
    }),
  );

  return router;
};
