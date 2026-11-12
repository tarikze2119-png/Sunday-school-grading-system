import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email?: string | null;
        role: UserRole;
        firstName: string;
        lastName: string;
        studentId?: string;
        teacherId?: string;
        tokenVersion?: number;
      };
    }
  }
}

export {};
