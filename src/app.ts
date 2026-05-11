import cors from 'cors';
import express from 'express';

import type { AppEnv } from './config/env.js';
import { errorHandler } from './shared/http/error-handler.js';
import { createAuthRouter } from './contexts/identity-access/interfaces/http/auth.routes.js';
import { createDeviceRouter } from './contexts/device-management/interfaces/http/device.routes.js';
import { createEdgeDeviceRouter } from './contexts/device-management/interfaces/http/edge-device.routes.js';
import { createIrrigationRouter } from './contexts/irrigation-intelligence/interfaces/http/irrigation.routes.js';
import { createWeatherRouter } from './contexts/irrigation-intelligence/interfaces/http/weather.routes.js';
import type { AppServices } from './composition-root.js';
import { createSwaggerRouter } from './openapi/swagger.routes.js';

export const createApp = (env: AppEnv, services: AppServices) => {
  const app = express();

  app.use(
    cors({
      origin: env.allowedOrigins.includes('*') ? true : env.allowedOrigins,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'aquasave-api',
      environment: env.nodeEnv,
    });
  });

  app.use('/api', createSwaggerRouter());
  app.use('/api/auth', createAuthRouter(services));
  app.use('/api/devices', createDeviceRouter(services));
  app.use('/api/edge', createEdgeDeviceRouter(env, services));
  app.use('/api/irrigation', createIrrigationRouter(services));
  app.use('/api/weather', createWeatherRouter(services));

  app.use(errorHandler);

  return app;
};
