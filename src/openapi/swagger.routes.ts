import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { openApiDocument } from './openapi-document.js';

export const createSwaggerRouter = () => {
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'AquaSave API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );

  return router;
};
