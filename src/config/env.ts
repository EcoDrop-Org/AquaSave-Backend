import dotenv from 'dotenv';

dotenv.config();

export type AppEnv = {
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
  dataDir: string;
  databaseUrl: string;
  jwtSecret: string;
  edgeApiKey?: string;
  weatherProvider: 'open-meteo';
  /** Zona horaria para evaluar los horarios de riego programado (HH:MM). */
  scheduleTimezone: string;
  /** Duracion maxima (min) de un riego iniciado por horario programado. */
  scheduledRunMinutes: number;
};

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const optional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const parseAllowedOrigins = (value: string | undefined): string[] => {
  const origins = (value ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Una variable vacia bloquearia todos los origenes; mejor permitir todos.
  return origins.length > 0 ? origins : ['*'];
};

export const env: AppEnv = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  dataDir: process.env.DATA_DIR ?? './data',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  edgeApiKey: optional(process.env.EDGE_API_KEY),
  weatherProvider: 'open-meteo',
  scheduleTimezone: process.env.SCHEDULE_TIMEZONE ?? 'America/Lima',
  scheduledRunMinutes: Number(process.env.SCHEDULED_RUN_MINUTES ?? 5),
};
