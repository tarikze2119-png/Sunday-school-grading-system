import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service.js';
import prisma from '../config/prisma.client.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(identifier, password, ipAddress, userAgent);

      // Store Refresh Token in secure HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'እንኳን በደህና መጡ! ወደ ሲስተሙ በተሳካ ሁኔታ ገብተዋል።',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      const result = await authService.refresh(token);

      res.status(200).json({
        success: true,
        message: 'የመግቢያ ፈቃድዎ ታድሷል።',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.status(200).json({
        success: true,
        message: 'ከሰርዓቱ በተሳካ ሁኔታ ወጥተዋል።',
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'እባክዎ መጀመሪያ ይግቡ።',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          firstName: true,
          lastName: true,
          grandfatherName: true,
          isActive: true,
          lastLoginAt: true,
          studentProfile: {
            select: {
              id: true,
              admissionNumber: true,
              baptismalName: true,
              gender: true,
              batchId: true,
              academicYearId: true,
              batch: { select: { id: true, name: true, stageLevel: true } },
              academicYear: { select: { id: true, name: true, code: true } },
            },
          },
          teacherProfile: {
            select: {
              id: true,
              teacherCode: true,
              spiritualTitle: true,
              qualification: true,
              specialization: true,
            },
          },
          managementProfile: {
            select: {
              id: true,
              department: true,
              positionTitle: true,
              officePhone: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'ተጠቃሚው አልተገኘም።',
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.changePassword(
        req.user!.id,
        currentPassword,
        newPassword,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async adminResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = req.params;
      const { newPassword } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.adminResetPassword(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        targetUserId,
        newPassword,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
