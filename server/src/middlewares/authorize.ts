import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export const authorizeRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'እባክዎ መጀመሪያ ይግቡ።',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ይህንን ተግባር ለማከናወን የሚያስችል የፈቃድ ደረጃ የለዎትም።',
      });
    }

    next();
  };
};
