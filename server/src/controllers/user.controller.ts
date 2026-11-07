import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service.js';
import { UserRole } from '@prisma/client';

export class UserController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, search, isActive, page, limit } = req.query;
      const result = await userService.listUsers({
        role: role as UserRole,
        search: search as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const user = await userService.createUser(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        req.body,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: `ተጠቃሚ '${user.username}' በተሳካ ሁኔታ ተፈጥሯል።`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await userService.toggleUserStatus(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        id,
        Boolean(isActive),
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: isActive
          ? `የተጠቃሚ '${updated.username}' አካውንት እንዲሰራ ተፈቅዶለታል (Active)`
          : `የተጠቃሚ '${updated.username}' አካውንት ታግዷል (Suspended)`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await userService.getAuditLogs(
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 25
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
export default userController;
