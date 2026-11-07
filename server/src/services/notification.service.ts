import prisma from '../config/prisma.client.js';
import { NotificationType, UserRole } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

export class NotificationService {
  /**
   * Create a single notification for a specific user
   */
  async createNotification(data: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl || null,
        isRead: false,
      },
    });
  }

  /**
   * Broadcast a notification to all users matching given roles
   */
  async notifyUsersByRole(roles: UserRole[], type: NotificationType, title: string, message: string, linkUrl?: string) {
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length === 0) return { count: 0 };

    const records = users.map((u) => ({
      userId: u.id,
      type,
      title,
      message,
      linkUrl: linkUrl || null,
      isRead: false,
    }));

    return prisma.notification.createMany({
      data: records,
    });
  }

  /**
   * Get notifications for a user, sorted descending by date
   */
  async getUserNotifications(userId: string, isRead?: boolean, limit: number = 50) {
    const whereClause: any = { userId };
    if (isRead !== undefined) {
      whereClause.isRead = isRead;
    }

    return prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get total count of unread notifications for badge display
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('የተጠየቀው ማስታወቂያ አልተገኘም ወይም ፈቃድ የለዎትም።');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all unread notifications of a user as read
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Delete or dismiss an individual notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('የተጠየቀው ማስታወቂያ አልተገኘም ወይም ፈቃድ የለዎትም።');
    }

    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}

export default new NotificationService();
