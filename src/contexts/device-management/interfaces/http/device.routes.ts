import { Router } from 'express';
import { z } from 'zod';

import type { AppServices } from '../../../../composition-root.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import {
  authMiddleware,
  requireAuth,
} from '../../../../shared/http/auth.middleware.js';
import { param } from '../../../../shared/http/params.js';
import { notFound } from '../../../../shared/http/http-error.js';

const locationSchema = z.object({
  label: z.string().min(3),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const pairDeviceSchema = z.object({
  name: z.string().min(3),
  location: locationSchema,
  plantCount: z.number().int().min(1).max(1000).optional(),
  cropType: z.string().min(2).optional(),
  firmwareVersion: z.string().min(1).optional(),
});

const updateDeviceSchema = z.object({
  name: z.string().min(3).optional(),
  location: locationSchema.optional(),
  plantCount: z.number().int().min(1).max(1000).optional(),
  cropType: z.string().min(2).nullable().optional(),
});

export const createDeviceRouter = (services: AppServices) => {
  const router = Router();

  router.use(authMiddleware(services));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const devices = await services.deviceManagement.listDevices.execute(
        accountId,
      );
      res.json({ devices });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const input = pairDeviceSchema.parse(req.body);
      const device = await services.deviceManagement.pairDevice.execute({
        ...input,
        accountId,
      });
      res.status(201).json({ device });
    }),
  );

  router.get(
    '/:deviceId',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const device = await services.deviceManagement.getDevice.execute(
        param(req.params, 'deviceId'),
        accountId,
      );
      res.json({ device });
    }),
  );

  router.patch(
    '/:deviceId',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const input = updateDeviceSchema.parse(req.body);
      const device = await services.deviceManagement.updateDevice.execute({
        ...input,
        deviceId: param(req.params, 'deviceId'),
        accountId,
      });
      res.json({ device });
    }),
  );

  router.delete(
    '/:deviceId',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      await services.deviceManagement.unpairDevice.execute(
        param(req.params, 'deviceId'),
        accountId,
      );
      res.status(204).send();
    }),
  );

  const deviceSettingsSchema = z.object({
    minMoisture: z.number().min(0).max(100).optional(),
    optimalMoisture: z.number().min(0).max(100).optional(),
    maxMoisture: z.number().min(0).max(100).optional(),
    hotAlertC: z.number().min(-20).max(60).optional(),
    coldAlertC: z.number().min(-20).max(60).optional(),
    rainPausePct: z.number().min(0).max(100).optional(),
    schedules: z.array(z.object({
      timeText: z.string(),
      enabled: z.boolean(),
    })).optional(),
  });

  router.get(
    '/:deviceId/settings',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = param(req.params, 'deviceId');
      const device = await services.deviceManagement.repository.findById(deviceId);
      if (!device || device.accountId !== accountId) throw notFound('Device not found');
      const settings = await services.deviceManagement.repository.getSettings(deviceId);
      res.json({ settings });
    }),
  );

  router.put(
    '/:deviceId/settings',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = param(req.params, 'deviceId');
      const device = await services.deviceManagement.repository.findById(deviceId);
      if (!device || device.accountId !== accountId) throw notFound('Device not found');
      const input = deviceSettingsSchema.parse(req.body);
      const settings = await services.deviceManagement.repository.putSettings(deviceId, input as Record<string, unknown>);
      res.json({ settings });
    }),
  );

  return router;
};
