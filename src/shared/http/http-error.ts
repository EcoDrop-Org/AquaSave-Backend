export class HttpError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, errorName: string, details?: unknown) {
    super(message);
    this.name = errorName;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (message: string) =>
  new HttpError(404, message, 'NotFoundError');
export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, 'BadRequestError', details);
export const conflict = (message: string) =>
  new HttpError(409, message, 'ConflictError');
export const unauthorized = (message: string) =>
  new HttpError(401, message, 'UnauthorizedError');
export const forbidden = (message: string) =>
  new HttpError(403, message, 'ForbiddenError');
