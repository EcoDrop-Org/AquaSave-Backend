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

// Scheduler de riego programado: revisa cada 20 s los horarios configurados
// en la app (device_settings.schedules) y encola comandos para el EdgeAPI.
setInterval(() => {
  services.irrigationIntelligence.scheduledIrrigation
    .tick()
    .catch((err) => console.error('[Scheduler] tick fallo:', err));
}, 20_000);

app.listen(env.port, () => {
  console.log(`AquaSave API listening on http://localhost:${env.port}`);
});
