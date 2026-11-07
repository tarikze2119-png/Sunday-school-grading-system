import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

router.get('/', (req, res) => notificationController.getMyNotifications(req, res));
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));
router.patch('/read-all', (req, res) => notificationController.markAllAsRead(req, res));
router.patch('/:id/read', (req, res) => notificationController.markAsRead(req, res));
router.delete('/:id', (req, res) => notificationController.deleteNotification(req, res));

// Broadcast (Super Admin & Admin only)
router.post(
  '/broadcast',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => notificationController.broadcastNotification(req, res)
);

export default router;
