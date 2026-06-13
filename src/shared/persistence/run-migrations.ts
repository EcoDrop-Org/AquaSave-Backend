import type { PgClient } from './pg-client.js';

export const runMigrations = async (sql: PgClient): Promise<void> => {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL,
      profile_type  TEXT NOT NULL DEFAULT 'horticultor-urbano',
      space_type    TEXT,
      crop_types    TEXT[] NOT NULL DEFAULT '{}',
      location_city TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL,
      last_login_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      token      TEXT NOT NULL UNIQUE,
      user_id    TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions (token)`;

  await sql`
    CREATE TABLE IF NOT EXISTS devices (
      id                 TEXT PRIMARY KEY,
      account_id         TEXT NOT NULL,
      name               TEXT NOT NULL,
      location_label     TEXT NOT NULL,
      location_latitude  DOUBLE PRECISION,
      location_longitude DOUBLE PRECISION,
      status             TEXT NOT NULL DEFAULT 'offline',
      firmware_version   TEXT,
      is_active          BOOLEAN NOT NULL DEFAULT true,
      plant_count        INTEGER NOT NULL DEFAULT 1,
      crop_type          TEXT,
      valve_state        TEXT NOT NULL DEFAULT 'closed',
      last_telemetry     JSONB,
      created_at         TIMESTAMPTZ NOT NULL,
      updated_at         TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS devices_account_id_idx ON devices (account_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS irrigation_events (
      id              TEXT PRIMARY KEY,
      device_id       TEXT NOT NULL,
      started_at      TIMESTAMPTZ NOT NULL,
      ended_at        TIMESTAMPTZ,
      liters_consumed DOUBLE PRECISION NOT NULL DEFAULT 0,
      trigger_type    TEXT NOT NULL,
      status          TEXT NOT NULL,
      was_skipped     BOOLEAN NOT NULL DEFAULT false,
      skip_reason     TEXT,
      command_id      TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS irrigation_events_device_id_idx ON irrigation_events (device_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS edge_commands (
      id              TEXT PRIMARY KEY,
      device_id       TEXT NOT NULL,
      type            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      issued_at       TIMESTAMPTZ NOT NULL,
      acknowledged_at TIMESTAMPTZ
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS edge_commands_device_id_status_idx ON edge_commands (device_id, status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS device_settings (
      device_id  TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      settings   JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url TEXT
  `;

  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone TEXT
  `;
};
