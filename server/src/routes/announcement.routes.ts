import { Router } from 'express';
import announcementController from '../controllers/announcement.controller.js';
import announcementService from '../services/announcement.service.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// ==========================================
// CRON / AUTOMATED SYNC ENDPOINT
// ==========================================
router.post(
  '/sync-schedule',
  async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      try {
        await announcementService.autoSyncAnnouncementStatuses();
        return res.status(200).json({ success: true, message: 'የቀጠሮ ማስታወቂያዎች በስኬት ተመሳስለዋል።' });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }
    next();
  },
  authenticateJwt,
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  async (req, res) => {
    try {
      await announcementService.autoSyncAnnouncementStatuses();
      return res.status(200).json({ success: true, message: 'የቀጠሮ ማስታወቂያዎች በስኬት ተመሳስለዋል።' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Base Authentication required for all other announcement actions
router.use(authenticateJwt);

// ==========================================
// RECIPIENT ACTIONS (All Authenticated Roles)
// ==========================================
router.get('/my', (req, res) => announcementController.getMyAnnouncements(req, res));
router.get('/my/:id', (req, res) => announcementController.getMyAnnouncementDetails(req, res));
router.get('/unread-count', (req, res) => announcementController.getUnreadCount(req, res));
router.patch('/:id/read', (req, res) => announcementController.markAsRead(req, res));

// ==========================================
// ADMINISTRATIVE ACTIONS (SUPER_ADMIN & ADMIN)
// ==========================================
router.post(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.createAnnouncement(req, res)
);

router.get(
  '/admin',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.getAdminAnnouncements(req, res)
);

router.get(
  '/:id/stats',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.getDetailedRecipientStats(req, res)
);

router.get(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.getAnnouncementById(req, res)
);

router.put(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.updateAnnouncement(req, res)
);

router.patch(
  '/:id/publish',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.publishAnnouncement(req, res)
);

router.patch(
  '/:id/archive',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => announcementController.archiveAnnouncement(req, res)
);

export default router;
