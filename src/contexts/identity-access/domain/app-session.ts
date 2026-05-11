export type AppSession = {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
};

export const isSessionValid = (
  session: AppSession,
  now = new Date(),
): boolean => {
  return !session.revokedAt && Date.parse(session.expiresAt) > now.getTime();
};
