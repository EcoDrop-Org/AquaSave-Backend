import { Router } from 'express';

import type { AppServices } from '../../../../composition-root.js';
import { asyncHandler } from '../../../../shared/http/async-handler.js';
import {
  authMiddleware,
  requireAuth,
} from '../../../../shared/http/auth.middleware.js';
import { param } from '../../../../shared/http/params.js';
import { notFound } from '../../../../shared/http/http-error.js';

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

  // GET /api/irrigation/analytics?deviceId=<id>
  // Returns aggregated KPIs and daily/cumulative data for the last 30 days.
  router.get(
    '/analytics',
    asyncHandler(async (req, res) => {
      const { accountId } = requireAuth(req);
      const deviceId = typeof req.query['deviceId'] === 'string' ? req.query['deviceId'] : undefined;

      // Verify device ownership if deviceId provided
      if (deviceId) {
        const device = await services.deviceManagement.repository.findById(deviceId);
        if (!device || device.accountId !== accountId) throw notFound('Device not found');
      }

      // Fetch all user devices (always needed for cropBreakdown)
      const allDevices = await services.deviceManagement.repository.findByAccountId(accountId);

      // Verify ownership if filtering by deviceId
      if (deviceId) {
        const target = allDevices.find(d => d.id === deviceId);
        if (!target) throw notFound('Device not found');
      }

      // Build a map deviceId → cropType for breakdown
      const cropByDevice: Record<string, string> = {};
      for (const d of allDevices) {
        cropByDevice[d.id] = d.cropType ?? 'Otro';
      }

      // Fetch events
      const devicesToFetch = deviceId ? [{ id: deviceId }] : allDevices;
      const allEventArrays = await Promise.all(
        devicesToFetch.map(d => services.irrigationIntelligence.eventRepository.findByDeviceId(d.id))
      );
      const events = allEventArrays.flat();

      const now = new Date();
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recent = events.filter(e => new Date(e.startedAt) >= cutoff && e.status === 'completed');

      // KPIs
      const totalLiters = recent.reduce((sum, e) => sum + e.litersConsumed, 0);
      const totalEvents = recent.length;
      const avgDailyLiters = totalEvents > 0 ? totalLiters / 30 : 0;
      const totalDurationSec = recent.reduce((sum, e) => {
        if (!e.endedAt) return sum;
        return sum + (new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 1000;
      }, 0);
      const avgDurationMin = totalEvents > 0 ? totalDurationSec / 60 / totalEvents : 0;

      // Daily buckets (last 30 days)
      const dailyMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        dailyMap[key] = 0;
      }
      for (const e of recent) {
        const d = new Date(e.startedAt);
        const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (key in dailyMap) dailyMap[key] = (dailyMap[key] ?? 0) + e.litersConsumed;
      }
      const dailyLabels = Object.keys(dailyMap);
      const dailyValues = Object.values(dailyMap);

      // Cumulative
      const cumulative: number[] = [];
      let running = 0;
      for (const v of dailyValues) { running += v; cumulative.push(parseFloat(running.toFixed(2))); }

      // Crop breakdown — group total liters by cropType
      const cropMap: Record<string, number> = {};
      for (const e of recent) {
        const crop = cropByDevice[e.deviceId] ?? 'Otro';
        cropMap[crop] = (cropMap[crop] ?? 0) + e.litersConsumed;
      }
      const cropBreakdown = Object.entries(cropMap)
        .map(([crop, liters]) => ({ crop, liters: parseFloat(liters.toFixed(1)) }))
        .sort((a, b) => b.liters - a.liters);

      res.json({
        kpis: {
          totalLiters: parseFloat(totalLiters.toFixed(1)),
          avgDailyLiters: parseFloat(avgDailyLiters.toFixed(1)),
          totalEvents,
          avgDurationMin: parseFloat(avgDurationMin.toFixed(1)),
        },
        daily: { labels: dailyLabels, values: dailyValues },
        cumulative,
        cropBreakdown,
      });
    }),
  );

  return router;
};
