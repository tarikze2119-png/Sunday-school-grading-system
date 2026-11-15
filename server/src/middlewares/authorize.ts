import { Request, Response, NextFunction } from 'express';
import { UserRole, AdminResponsibility } from '@prisma/client';
import prisma from '../config/prisma.client.js';

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

/**
 * Middleware ensuring the authenticated user has a specific administrative responsibility.
 * Super Admin implicitly possesses administrative permissions.
 * Subordinate Admin accounts must have the explicit responsibility assigned.
 */
export const requireResponsibility = (responsibility: AdminResponsibility) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'እባክዎ መጀመሪያ ይግቡ።',
      });
    }

    // Super Admin has highest administrative authority
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Admin role requires explicit responsibility assignment
    if (
      req.user.role === UserRole.ADMIN &&
      req.user.adminResponsibilities &&
      req.user.adminResponsibilities.includes(responsibility)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'ይህንን ተግባር ለማከናወን የሚያስችል የኃላፊነት ፈቃድ የለዎትም።',
      code: 'FORBIDDEN_RESPONSIBILITY_REQUIRED',
    });
  };
};

/**
 * Middleware ensuring the authenticated user is the actively appointed General Admin.
 */
export const requireGeneralAdmin = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'እባክዎ መጀመሪያ ይግቡ።',
      });
    }

    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { id: 'SYSTEM_DEFAULT' },
        select: { generalAdminUserId: true },
      });

      if (!setting || setting.generalAdminUserId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'ይህንን ተግባር ለማከናወን የዋና አስተዳዳሪነት (General Admin) ስልጣን ያስፈልጋል።',
          code: 'FORBIDDEN_GENERAL_ADMIN_REQUIRED',
        });
      }

      req.user.isGeneralAdmin = true;
      next();
    } catch (error) {
      next(error);
    }
  };
};
