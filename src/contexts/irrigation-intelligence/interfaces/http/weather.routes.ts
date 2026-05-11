import { Router } from 'express';

import type { AppServices } from '../../../../composition-root.js';
import { badRequest } from '../../../../shared/http/http-error.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import {
  authMiddleware,
  requireAuth,
} from '../../../../shared/http/auth.middleware.js';

export const createWeatherRouter = (services: AppServices) => {
  const router = Router();

  router.use(authMiddleware(services));

  router.get(
    '/forecast',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = String(req.query.deviceId ?? '');
      if (!deviceId) {
        throw badRequest('Query parameter deviceId is required');
      }

      const forecast =
        await services.irrigationIntelligence.getWeatherForecast.execute(
          deviceId,
          accountId,
        );
      res.json({ forecast });
    }),
  );

  return router;
};
