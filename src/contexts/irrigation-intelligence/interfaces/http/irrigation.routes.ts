import { Router } from 'express';

import type { AppServices } from '../../../../composition-root.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import {
  authMiddleware,
  requireAuth,
} from '../../../../shared/http/auth.middleware.js';
import { param } from '../../../../shared/http/params.js';

export const createIrrigationRouter = (services: AppServices) => {
  const router = Router();

  router.use(authMiddleware(services));

  router.get(
    '/devices/:deviceId/state',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = param(req.params, 'deviceId');
      const state =
        await services.irrigationIntelligence.getIrrigationState.execute(
          deviceId,
          accountId,
        );
      res.json({ state });
    }),
  );

  router.post(
    '/devices/:deviceId/start',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = param(req.params, 'deviceId');
      const event =
        await services.irrigationIntelligence.startIrrigation.execute(
          deviceId,
          accountId,
        );
      res.status(202).json({ event });
    }),
  );

  router.post(
    '/devices/:deviceId/stop',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = param(req.params, 'deviceId');
      const event =
        await services.irrigationIntelligence.stopIrrigation.execute(
          deviceId,
          accountId,
        );
      res.status(202).json({ event });
    }),
  );

  router.get(
    '/devices/:deviceId/events',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = param(req.params, 'deviceId');
      const events =
        await services.irrigationIntelligence.listIrrigationEvents.execute(
          deviceId,
          accountId,
        );
      res.json({ events });
    }),
  );

  return router;
};
