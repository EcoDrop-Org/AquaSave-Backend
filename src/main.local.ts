/**
 * Arranque local sin PostgreSQL: usa los repositorios de archivos JSON en
 * `DATA_DIR`. Util para desarrollo y pruebas E2E en una maquina sin base de
 * datos. Produccion sigue usando `main.ts`.
 */
import { createApp } from './app.js';
import { buildServices } from './composition-root.js';
import { env } from './config/env.js';

const services = buildServices(env);
const app = createApp(env, services);

app.listen(env.port, () => {
  console.log(`AquaSave API (local, archivos JSON) en http://localhost:${env.port}`);
  console.log(`Datos en ${env.dataDir}`);
});
