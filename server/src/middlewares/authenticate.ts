import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config.js';
import { UserRole } from '@prisma/client';
import prisma from '../config/prisma.client.js';

interface JwtPayload {
  userId: string;
  username: string;
  email?: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  studentId?: string;
  teacherId?: string;
  tokenVersion?: number;
}

export const authenticateJwt = async (
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

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'የመግቢያ ፈቃድዎ ትክክል አይደለም።',
      });
    }

    // Tokens issued without tokenVersion (pre-migration) must not bypass verification
    if (typeof decoded.tokenVersion !== 'number') {
      return res.status(401).json({
        success: false,
        message: 'የመግቢያ ፈቃድዎ ጊዜው አልፎበታል፤ እባክዎ እንደገና ይግቡ።',
      });
    }

    // Securely validate user existence, active status, and tokenVersion in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'ተጠቃሚው አልተገኘም ወይም አካውንቱ ታግዷል።',
      });
    }

    // Immediately reject token if tokenVersion does not match current DB value
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'የይለፍ ቃል ስለተቀየረ ወይም የመግቢያ ፈቃድዎ ስለተሰረዘ እባክዎ እንደገና ይግቡ።',
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: decoded.studentId,
      teacherId: decoded.teacherId,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'የመግቢያ ፈቃድዎ ጊዜው አልፎበታል፤ እባክዎ እንደገና ይግቡ።',
    });
  }
};
