import api from './api';
import { InAppNotification } from '../types/report.types';

export const notificationService = {
  getMyNotifications: async (isRead?: boolean): Promise<InAppNotification[]> => {
    const params = isRead !== undefined ? { isRead } : {};
    const res = await api.get('/notifications', { params });
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/notifications/unread-count');
    return res.data.data.unreadCount;
  },

  markAsRead: async (notificationId: string): Promise<InAppNotification> => {
    const res = await api.patch(`/notifications/${notificationId}/read`);
    return res.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  },

  broadcastNotification: async (data: {
    roles?: string[];
    title: string;
    message: string;
    type?: string;
    linkUrl?: string;
  }): Promise<{ count: number }> => {
    const res = await api.post('/notifications/broadcast', data);
    return res.data.data;
  },
};

export default notificationService;
