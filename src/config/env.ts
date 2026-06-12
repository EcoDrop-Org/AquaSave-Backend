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

export const env: AppEnv = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  dataDir: process.env.DATA_DIR ?? './data',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  edgeApiKey: optional(process.env.EDGE_API_KEY),
  weatherProvider: 'open-meteo',
};
