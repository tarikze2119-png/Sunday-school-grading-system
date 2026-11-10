import api from './api';
import {
  AnnouncementItem,
  RecipientAnnouncementItem,
  DetailedRecipientStats,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  AnnouncementTargetAudience,
  AnnouncementPriority,
  AnnouncementStatus,
} from '../types/announcement.types';

export interface AdminAnnouncementFilterParams {
  status?: AnnouncementStatus | 'ALL';
  targetAudience?: AnnouncementTargetAudience | 'ALL';
  priority?: AnnouncementPriority | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminAnnouncementListResponse {
  items: AnnouncementItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const announcementService = {
  // Admin Methods
  getAdminAnnouncements: async (params?: AdminAnnouncementFilterParams): Promise<AdminAnnouncementListResponse> => {
    const res = await api.get('/announcements/admin', { params });
    return res.data.data;
  },

  getAnnouncementById: async (id: string): Promise<AnnouncementItem> => {
    const res = await api.get(`/announcements/${id}`);
    return res.data.data;
  },

  createAnnouncement: async (payload: CreateAnnouncementPayload): Promise<AnnouncementItem> => {
    const res = await api.post('/announcements', payload);
    return res.data.data;
  },

  updateAnnouncement: async (id: string, payload: UpdateAnnouncementPayload): Promise<AnnouncementItem> => {
    const res = await api.put(`/announcements/${id}`, payload);
    return res.data.data;
  },

  publishAnnouncement: async (id: string): Promise<AnnouncementItem> => {
    const res = await api.patch(`/announcements/${id}/publish`);
    return res.data.data;
  },

  archiveAnnouncement: async (id: string): Promise<AnnouncementItem> => {
    const res = await api.patch(`/announcements/${id}/archive`);
    return res.data.data;
  },

  getDetailedRecipientStats: async (id: string): Promise<DetailedRecipientStats> => {
    const res = await api.get(`/announcements/${id}/stats`);
    return res.data.data;
  },

  // Recipient (All Roles) Methods
  getMyAnnouncements: async (): Promise<RecipientAnnouncementItem[]> => {
    const res = await api.get('/announcements/my');
    return res.data.data;
  },

  getMyAnnouncementDetails: async (id: string): Promise<RecipientAnnouncementItem> => {
    const res = await api.get(`/announcements/my/${id}`);
    return res.data.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/announcements/${id}/read`);
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/announcements/unread-count');
    return res.data.data.unreadCount;
  },
};

export default announcementService;
