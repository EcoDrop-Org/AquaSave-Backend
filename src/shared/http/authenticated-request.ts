import type { PublicUser } from '../../contexts/identity-access/domain/user.js';

export type RequestAuth = {
  user: PublicUser;
  token: string;
  accountId: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuth;
    }
  }
}
