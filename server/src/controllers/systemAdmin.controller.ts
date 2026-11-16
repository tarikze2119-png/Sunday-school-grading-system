import { Request, Response, NextFunction } from 'express';
import systemSettingService from '../services/systemSetting.service.js';

export class SystemAdminController {
  async registerGeneralAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await systemSettingService.registerAndAppointGeneralAdmin(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        req.body,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async appointGeneralAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await systemSettingService.appointGeneralAdmin(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        targetUserId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeGeneralAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await systemSettingService.revokeGeneralAdmin(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async transferGeneralAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await systemSettingService.transferGeneralAdmin(
        { id: req.user!.id, role: req.user!.role, username: req.user!.username },
        targetUserId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemSettingService.getGeneralAdminStatus();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const systemAdminController = new SystemAdminController();
export default systemAdminController;
