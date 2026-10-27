import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import type { AppEnv } from './config/env.js';
import type { AppServices } from './composition-root.js';

const envWith = (overrides: Partial<AppEnv> = {}): AppEnv =>
  ({
    port: 3000,
    nodeEnv: 'production',
    allowedOrigins: ['https://aquasave-cae9e.web.app'],
    dataDir: './data',
    databaseUrl: 'postgres://unused',
    jwtSecret: 'test-secret',
    weatherProvider: 'open-meteo',
    scheduleTimezone: 'America/Lima',
    scheduledRunMinutes: 5,
    geminiModel: 'gemini-3.5-flash-lite',
    ...overrides,
  }) as AppEnv;

/** Lee el allow-origin que devuelve el preflight para un Origin dado. */
const preflight = async (env: AppEnv, origin: string) => {
  const app = createApp(env, {} as AppServices);
  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
      },
    });
    return response.headers.get('access-control-allow-origin');
  } finally {
    server.close();
  }
};

describe('CORS', () => {
  it('permite los origenes de ALLOWED_ORIGINS', async () => {
    const allowed = await preflight(
      envWith(),
      'https://aquasave-cae9e.web.app',
    );

    expect(allowed).toBe('https://aquasave-cae9e.web.app');
  });

  it('permite localhost en cualquier puerto', async () => {
    // `flutter run` usa un puerto distinto en cada arranque.
    for (const origin of [
      'http://localhost:5173',
      'http://localhost:63952',
      'http://127.0.0.1:8080',
    ]) {
      expect(await preflight(envWith(), origin)).toBe(origin);
    }
  });

  it('bloquea un origen ajeno', async () => {
    const allowed = await preflight(envWith(), 'https://sitio-ajeno.test');

    expect(allowed).toBeNull();
  });

  it('acepta todo cuando ALLOWED_ORIGINS es *', async () => {
    // Con origin: true el paquete cors refleja el Origin recibido en lugar
    // de responder '*', que es lo correcto para peticiones con credenciales.
    const allowed = await preflight(
      envWith({ allowedOrigins: ['*'] }),
      'https://sitio-ajeno.test',
    );

    expect(allowed).toBe('https://sitio-ajeno.test');
  });
});
