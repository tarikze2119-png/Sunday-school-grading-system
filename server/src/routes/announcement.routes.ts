import { Router } from 'express';
import announcementController from '../controllers/announcement.controller.js';
import announcementService from '../services/announcement.service.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// ==========================================
// CRON / AUTOMATED SYNC ENDPOINT (GET & POST)
// ==========================================
const handleScheduledSync = async (req: any, res: any) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // 1. Check if invoked by Vercel Cron or automated scheduler with valid CRON_SECRET
  if (cronSecret && cronSecret.trim().length > 0) {
    if (authHeader === `Bearer ${cronSecret}`) {
      try {
        const stats = await announcementService.autoSyncAnnouncementStatuses();
        return res.status(200).json({
          success: true,
          message: 'የቀጠሮ ማስታወቂያዎች በስኬት ተመሳስለዋል።',
          data: stats,
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message || 'ማመሳሰል አልተቻለም።' });
      }
    }
  }

  // 2. Otherwise require Super Admin or Admin JWT authentication
  authenticateJwt(req, res, () => {
    authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN])(req, res, async () => {
      try {
        const stats = await announcementService.autoSyncAnnouncementStatuses();
        return res.status(200).json({
          success: true,
          message: 'የቀጠሮ ማስታወቂያዎች በስኬት ተመሳስለዋል።',
          data: stats,
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message || 'ማመሳሰል አልተቻለም።' });
      }
    });
  });
};

// Vercel Cron invokes via GET; Admins / manual tools can invoke via GET or POST
router.get('/sync-schedule', handleScheduledSync);
router.post('/sync-schedule', handleScheduledSync);

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
