import type { ProfileType } from './profile-type.js';

export type UserProfile = {
  fullName: string;
  profileType: ProfileType;
  spaceType?: string;
  cropTypes: string[];
  locationCity?: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

export type PublicUser = Omit<User, 'passwordHash'>;

export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
};
