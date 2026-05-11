import { Router } from 'express';
import { z } from 'zod';

import type { AppEnv } from '../../../../config/env.js';
import type { AppServices } from '../../../../composition-root.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import { edgeApiKeyMiddleware } from '../../../../shared/http/edge-api-key.middleware.js';
import { param } from '../../../../shared/http/params.js';

const telemetrySchema = z.object({
  soilMoisturePct: z.number().min(0).max(100),
  temperatureC: z.number().min(-20).max(80),
  flowRateLMin: z.number().min(0).max(100).optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  recordedAt: z.string().datetime().optional(),
});

const statusSchema = z.object({
  status: z.enum(['online', 'offline', 'connecting', 'error']),
  firmwareVersion: z.string().min(1).optional(),
});

export const createEdgeDeviceRouter = (
  env: AppEnv,
  services: AppServices,
) => {
  const router = Router();

  router.use(edgeApiKeyMiddleware(env.edgeApiKey));

  router.post(
    '/devices/:deviceId/telemetry',
    asyncHandler(async (req, res) => {
      const deviceId = param(req.params, 'deviceId');
      const payload = telemetrySchema.parse(req.body);
      const device = await services.deviceManagement.recordTelemetry.execute({
        deviceId,
        ...payload,
      });
      res.status(202).json({ device });
    }),
  );

  router.post(
    '/devices/:deviceId/status',
    asyncHandler(async (req, res) => {
      const deviceId = param(req.params, 'deviceId');
      const payload = statusSchema.parse(req.body);
      const device = await services.deviceManagement.updateDeviceStatus.execute({
        deviceId,
        ...payload,
      });
      res.status(202).json({ device });
    }),
  );

  router.get(
    '/devices/:deviceId/commands/pending',
    asyncHandler(async (req, res) => {
      const deviceId = param(req.params, 'deviceId');
      const commands =
        await services.irrigationIntelligence.edgeGateway.getPendingCommands(
          deviceId,
        );
      res.json({ commands });
    }),
  );

  router.post(
    '/devices/:deviceId/commands/:commandId/ack',
    asyncHandler(async (req, res) => {
      const deviceId = param(req.params, 'deviceId');
      const commandId = param(req.params, 'commandId');
      const command =
        await services.irrigationIntelligence.edgeGateway.acknowledgeCommand(
          deviceId,
          commandId,
        );
      res.status(202).json({ command });
    }),
  );

  return router;
};
