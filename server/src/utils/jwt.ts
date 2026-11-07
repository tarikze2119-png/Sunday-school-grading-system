import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config.js';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  username: string;
  email?: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  studentId?: string;
  teacherId?: string;
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRATION,
  });
};

export const signRefreshToken = (payload: { userId: string }): string => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRATION,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
};
