import { Request, Response } from 'express';
import notificationService from '../services/notification.service.js';
import { NotificationType, UserRole } from '@prisma/client';

export class NotificationController {
  async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const isReadQuery = req.query.isRead;
      let isRead: boolean | undefined = undefined;

      if (isReadQuery === 'true') isRead = true;
      if (isReadQuery === 'false') isRead = false;

      const notifications = await notificationService.getUserNotifications(userId, isRead);
      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ማስታወቂያዎችን መጫን አልተቻለም።',
      });
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const count = await notificationService.getUnreadCount(userId);
      res.status(200).json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ያልተነበቡ ማስታወቂያዎችን ብዛት ማወቅ አልተቻለም።',
      });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const updated = await notificationService.markAsRead(id, userId);
      res.status(200).json({
        success: true,
        message: 'ማስታወቂያው እንደተነበበ ተመዝግቧል።',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ማስታወቂያውን መቀየር አልተቻለም።',
      });
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await notificationService.markAllAsRead(userId);
      res.status(200).json({
        success: true,
        message: 'ሁሉም ማስታወቂያዎች እንደተነበቡ ተደርገዋል።',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ማስታወቂያዎችን መቀየር አልተቻለም።',
      });
    }
  }

  async deleteNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      await notificationService.deleteNotification(id, userId);
      res.status(200).json({
        success: true,
        message: 'ማስታወቂያው ተሰርዟል።',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ማስታወቂያውን መሰረዝ አልተቻለም።',
      });
    }
  }

  async broadcastNotification(req: Request, res: Response) {
    try {
      const { roles, title, message, type, linkUrl } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'እባክዎ የማስታወቂያውን ርዕስ እና ዝርዝር መልእክት ያስገቡ።',
        });
      }

      const targetRoles: UserRole[] = roles && roles.length > 0 
        ? roles 
        : [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.STUDENT];

      const notifType: NotificationType = type || NotificationType.ANNOUNCEMENT;

      const result = await notificationService.notifyUsersByRole(
        targetRoles,
        notifType,
        title,
        message,
        linkUrl
      );

      res.status(201).json({
        success: true,
        message: `ማስታወቂያው ለተመረጡ ተጠቃሚዎች በተሳካ ሁኔታ ተልኳል (${(result as any).count || 0})።`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'ማስታወቂያውን ማሰራጨት አልተቻለም።',
      });
    }
  }
}

export default new NotificationController();
