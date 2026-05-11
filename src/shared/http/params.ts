import { badRequest } from './http-error.js';

export const param = (
  params: Record<string, string | string[] | undefined>,
  name: string,
): string => {
  const value = params[name];
  if (!value || Array.isArray(value)) {
    throw badRequest(`Missing route parameter: ${name}`);
  }
  return value;
};
