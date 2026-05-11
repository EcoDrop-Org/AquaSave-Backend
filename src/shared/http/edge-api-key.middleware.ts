import type { RequestHandler } from 'express';

import { unauthorized } from './http-error.js';

export const edgeApiKeyMiddleware = (edgeApiKey?: string): RequestHandler => {
  return (req, _res, next) => {
    if (!edgeApiKey) {
      next();
      return;
    }

    const provided = req.header('x-edge-api-key');
    if (provided !== edgeApiKey) {
      next(unauthorized('Invalid Edge API key'));
      return;
    }

    next();
  };
};
