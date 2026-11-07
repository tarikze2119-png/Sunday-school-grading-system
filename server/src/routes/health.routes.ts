import { Router, Request, Response } from 'express';
import prisma from '../config/prisma.client.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'unreachable';
  }

  res.json({
    success: true,
    message: 'የሰንበት ትምህርት ቤት የውጤት አስተዳደር ኤፒአይ በትክክል እየሰራ ይገኛል',
    system: 'Sunday School Student Grading Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

export default router;
