import { Router } from 'express';
import { z } from 'zod';

import type { AppServices } from '../../../../composition-root.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import {
  authMiddleware,
  requireAuth,
} from '../../../../shared/http/auth.middleware.js';

const forecastQuerySchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
});

export const createWeatherRouter = (services: AppServices) => {
  const router = Router();

  router.use(authMiddleware(services));

  router.get(
    '/forecast',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const { deviceId } = forecastQuerySchema.parse(req.query);

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
