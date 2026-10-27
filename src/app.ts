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

  app.use(cors({ origin: corsOrigin(env) }));
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

/**
 * Origenes permitidos: los de ALLOWED_ORIGINS mas cualquier localhost.
 *
 * `flutter run` asigna un puerto aleatorio en cada arranque, asi que una lista
 * fija de localhost no sirve. Se acepta localhost tambien contra el backend
 * desplegado para poder probar el front local contra produccion: una web
 * ajena no corre en el localhost del visitante, y la API exige token Bearer.
 */
const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const corsOrigin = (env: AppEnv) => {
  if (env.allowedOrigins.includes('*')) return true;

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Sin Origin (curl, apps nativas, el EdgeAPI): no es una peticion de
    // navegador, CORS no aplica.
    if (!origin) return callback(null, true);

    const allowed =
      env.allowedOrigins.includes(origin) || LOCALHOST.test(origin);

    callback(null, allowed);
  };
};
