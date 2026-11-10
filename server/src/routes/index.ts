import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import academicRoutes from './academic.routes.js';
import studentRoutes from './student.routes.js';
import teacherRoutes from './teacher.routes.js';
import courseRoutes from './course.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import gradeRoutes from './grade.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes from './notification.routes.js';
import gradingSchemeRoutes from './gradingScheme.routes.js';
import announcementRoutes from './announcement.routes.js';

const router = Router();

// Base health and system status
router.use('/health', healthRoutes);

// Authentication & Identity
router.use('/auth', authRoutes);

// Users Management
router.use('/users', userRoutes);

// Phase 3: Academic Administration Engine
router.use('/academic', academicRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);

// Phase 4: Academic Grading & Approval Engine
router.use('/grades', gradeRoutes);

// Phase 4A: Advanced Grading Scheme Management
router.use('/grading-schemes', gradingSchemeRoutes);

// Phase 6: Reporting, Notifications, and Academic History
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/announcements', announcementRoutes);

export default router;
