import { createApp } from './app.js';
import { buildServices } from './composition-root.js';
import { env } from './config/env.js';

const services = buildServices(env);
const app = createApp(env, services);

app.listen(env.port, () => {
  console.log(`AquaSave API listening on http://localhost:${env.port}`);
});
