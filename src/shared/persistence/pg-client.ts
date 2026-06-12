import postgres from 'postgres';

export type PgClient = postgres.Sql;

export const createPgClient = (connectionString: string, nodeEnv: string): PgClient => {
  return postgres(connectionString, {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 30,
    ssl: connectionString.includes('render.com') ? 'require' : undefined,
  });
};
