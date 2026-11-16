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

export interface RequireResponsibilityOptions {
  allowSuperAdmin?: boolean;
}

/**
 * Middleware ensuring the authenticated user has a specific administrative responsibility.
 * - If allowSuperAdmin is true (default), Super Admin possesses administrative permissions.
 *   If allowSuperAdmin is false, Super Admin is explicitly prohibited (e.g. grading scheme mutation).
 * - Appointed General Admin possesses oversight authority across all 4 sectors.
 * - Subordinate Admin accounts must have the explicit responsibility assigned.
 */
export const requireResponsibility = (
  responsibility: AdminResponsibility,
  options: RequireResponsibilityOptions = { allowSuperAdmin: true }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'እባክዎ መጀመሪያ ይግቡ።',
      });
    }

    // Super Admin evaluation
    if (req.user.role === UserRole.SUPER_ADMIN) {
      if (options.allowSuperAdmin !== false) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'ይህንን ተግባር ለማከናወን የሚያስችል የኃላፊነት ፈቃድ የለዎትም።',
        code: 'FORBIDDEN_RESPONSIBILITY_REQUIRED',
      });
    }

    if (req.user.role === UserRole.ADMIN) {
      // 1. Check if subordinate admin has explicit responsibility assigned
      if (
        req.user.adminResponsibilities &&
        req.user.adminResponsibilities.includes(responsibility)
      ) {
        return next();
      }

      // 2. Check if admin is the actively appointed General Admin (oversight across sectors)
      try {
        const setting = await prisma.systemSetting.findUnique({
          where: { id: 'SYSTEM_DEFAULT' },
          select: { generalAdminUserId: true },
        });

        if (setting && setting.generalAdminUserId === req.user.id) {
          req.user.isGeneralAdmin = true;
          return next();
        }
      } catch (error) {
        return next(error);
      }
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
