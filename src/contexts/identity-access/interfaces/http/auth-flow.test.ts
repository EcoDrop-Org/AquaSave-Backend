import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.js';
import { buildServices } from '../../../../composition-root.js';
import type { AppEnv } from '../../../../config/env.js';

describe('IAM protected resources', () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'aquasave-test-'));
    const env: AppEnv = {
      port: 0,
      nodeEnv: 'test',
      allowedOrigins: ['*'],
      dataDir,
      databaseUrl: '',
      jwtSecret: 'test-secret',
      weatherProvider: 'open-meteo',
      scheduleTimezone: 'America/Lima',
      scheduledRunMinutes: 5,
    };
    // Sin cliente Postgres: usa los repositorios de archivos en dataDir.
    const app = createApp(env, buildServices(env));

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not start test server');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it('keeps each user devices isolated and invalidates sessions on logout', async () => {
    const first = await registerUser('ana@aquasave.test');
    const second = await registerUser('luis@aquasave.test');

    const created = await api<{ device: { id: string } }>('/api/devices', {
      method: 'POST',
      token: first.token,
      body: {
        name: 'Huerto Ana',
        location: { label: 'Lima, Peru' },
        plantCount: 4,
      },
    });

    const firstDevices = await api<{ devices: unknown[] }>('/api/devices', {
      token: first.token,
    });
    const secondDevices = await api<{ devices: unknown[] }>('/api/devices', {
      token: second.token,
    });
    const forbiddenLookup = await fetch(
      `${baseUrl}/api/devices/${created.device.id}`,
      {
        headers: { authorization: `Bearer ${second.token}` },
      },
    );

    await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${first.token}` },
    });
    const afterLogout = await fetch(`${baseUrl}/api/devices`, {
      headers: { authorization: `Bearer ${first.token}` },
    });

    expect(firstDevices.devices).toHaveLength(1);
    expect(secondDevices.devices).toHaveLength(0);
    expect(forbiddenLookup.status).toBe(404);
    expect(afterLogout.status).toBe(401);
  });

  const registerUser = async (email: string) => {
    return api<{ token: string }>('/api/auth/register', {
      method: 'POST',
      body: {
        email,
        password: 'secure-password',
        fullName: email.split('@')[0],
        profileType: 'horticultor-urbano',
      },
    });
  };

  const api = async <T>(
    path: string,
    options: {
      method?: string;
      token?: string;
      body?: unknown;
    } = {},
  ): Promise<T> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(options.token
          ? { authorization: `Bearer ${options.token}` }
          : undefined),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  };
});
