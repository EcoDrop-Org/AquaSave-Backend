import { createApp } from './app.js';
import { buildServices } from './composition-root.js';
import { env } from './config/env.js';
import { createPgClient } from './shared/persistence/pg-client.js';
import { runMigrations } from './shared/persistence/run-migrations.js';

const sql = createPgClient(env.databaseUrl, env.nodeEnv);

await runMigrations(sql);
console.log('Database migrations applied');

const services = buildServices(env, sql);
const app = createApp(env, services);

app.listen(env.port, () => {
  console.log(`AquaSave API listening on http://localhost:${env.port}`);
});
