import { Request, Response } from 'express';
import announcementService from '../services/announcement.service.js';

export class AnnouncementController {
  /**
   * POST /api/v1/announcements
   * Admin: Create a new announcement
   */
  async createAnnouncement(req: Request, res: Response) {
    try {
      const creatorUserId = (req as any).user.id;
      const announcement = await announcementService.createAnnouncement(req.body, creatorUserId);
      return res.status(201).json({
        success: true,
        message: 'ማስታወቂያው በተሳካ ሁኔታ ተፈጥሯል።',
        data: announcement,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'ማስታወቂያውን መፍጠር አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/announcements/admin
   * Admin: List all announcements with administrative filters and recipient stats
   */
  async getAdminAnnouncements(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status as any,
        targetAudience: req.query.targetAudience as any,
        priority: req.query.priority as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await announcementService.getAdminAnnouncements(filters);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'ማስታወቂያዎችን ማውጣት አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/announcements/:id
   * Admin: Get single announcement details
   */
  async getAnnouncementById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const announcement = await announcementService.getAnnouncementById(id);
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'ማስታወቂያው አልተገኘም።',
        });
      }
      return res.status(200).json({
        success: true,
        data: announcement,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'የማስታወቂያውን መረጃ ማውጣት አልተቻለም።',
      });
    }
  }

  /**
   * PUT /api/v1/announcements/:id
   * Admin: Update announcement
   */
  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user.id;
      const updated = await announcementService.updateAnnouncement(id, req.body, adminUserId);
      return res.status(200).json({
        success: true,
        message: 'ማስታወቂያው በተሳካ ሁኔታ ተሻሽሏል።',
        data: updated,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'ማስታወቂያውን ማሻሻል አልተቻለም።',
      });
    }
  }

  /**
   * PATCH /api/v1/announcements/:id/publish
   * Admin: Publish draft or scheduled announcement
   */
  async publishAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user.id;
      const published = await announcementService.publishAnnouncement(id, adminUserId);
      return res.status(200).json({
        success: true,
        message: 'ማስታወቂያው በተሳካ ሁኔታ ተለጥፏል / ታትሟል።',
        data: published,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'ማስታወቂያውን መለጠፍ አልተቻለም።',
      });
    }
  }

  /**
   * PATCH /api/v1/announcements/:id/archive
   * Admin: Archive announcement
   */
  async archiveAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user.id;
      const archived = await announcementService.archiveAnnouncement(id, adminUserId);
      return res.status(200).json({
        success: true,
        message: 'ማስታወቂያው ወደ ማህደር (Archive) ተዘዋውሯል።',
        data: archived,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'ማስታወቂያውን ወደ ማህደር ማዛወር አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/announcements/:id/stats
   * Admin: Get detailed recipient delivery & read statistics
   */
  async getDetailedRecipientStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stats = await announcementService.getDetailedRecipientStats(id);
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'የማስታወቂያውን ስታቲስቲክስ ማውጣት አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/announcements/my
   * Recipient (All Roles): Get active announcements addressed to the logged-in user
   */
  async getMyAnnouncements(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const announcements = await announcementService.getAnnouncementsForUser(userId);
      return res.status(200).json({
        success: true,
        data: announcements,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'የእርስዎን ማስታወቂያዎች ማውጣት አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/announcements/my/:id
   * Recipient (All Roles): Read announcement details and automatically record read status
   */
  async getMyAnnouncementDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const details = await announcementService.getAnnouncementDetailsAndMarkRead(id, userId);
      return res.status(200).json({
        success: true,
        data: details,
      });
    } catch (err: any) {
      return res.status(403).json({
        success: false,
        message: err.message || 'ይህንን ማስታወቂያ ለመመልከት ፈቃድ የለዎትም።',
      });
    }
  }

  /**
   * PATCH /api/v1/announcements/:id/read
   * Recipient (All Roles): Explicitly mark announcement as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      await announcementService.markAsRead(id, userId);
      return res.status(200).json({
        success: true,
        message: 'ማስታወቂያው እንደተነበበ ተመዝግቧል።',
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'የማንበብ ሁኔታን መመዝገብ አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/announcements/unread-count
   * Recipient (All Roles): Get count of unread announcements for the badge
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const count = await announcementService.getUnreadCount(userId);
      return res.status(200).json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'ያልተነበቡ ማስታወቂያዎችን ብዛት ማወቅ አልተቻለም።',
      });
    }
  }
}

export default new AnnouncementController();
