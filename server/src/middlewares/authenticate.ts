import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config.js';
import { UserRole } from '@prisma/client';

interface JwtPayload {
  userId: string;
  username: string;
  email?: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  studentId?: string;
  teacherId?: string;
}

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'እባክዎ መጀመሪያ ወደ ሲስተሙ ይግቡ (ማረጋገጫ አልተገኘም)።',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      studentId: decoded.studentId,
      teacherId: decoded.teacherId,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'የመግቢያ ፈቃድዎ ጊዜው አልፎበታል፤ እባክዎ እንደገና ይግቡ።',
    });
  }
};
