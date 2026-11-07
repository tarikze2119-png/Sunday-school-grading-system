import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../config/prisma.client.js';

/**
 * Ensures students can only access their own student records.
 * Admins, Super Admins, and Management can access any student record.
 */
export const verifyStudentRecordOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'እባክዎ መጀመሪያ ይግቡ።' });
  }

  // Administrative roles have system-wide view privileges
  if (
    req.user.role === UserRole.SUPER_ADMIN ||
    req.user.role === UserRole.ADMIN ||
    req.user.role === UserRole.MANAGEMENT
  ) {
    return next();
  }

  const requestedStudentId = req.params.studentId || req.query.studentId;

  if (req.user.role === UserRole.STUDENT) {
    // Check if the student's own ID matches requested ID
    if (req.user.studentId && req.user.studentId === requestedStudentId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'የሌላ ተማሪን መረጃ የመመልከት ፈቃድ የለዎትም።',
    });
  }

  // Teachers are verified via course enrollment context
  next();
};

/**
 * Ensures teachers can only view or mutate grades of course offerings assigned to them.
 * Super Admins and Admins can view/manage all course offerings.
 */
export const verifyTeacherCourseAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'እባክዎ መጀመሪያ ይግቡ።' });
  }

  // Admins have override review privileges
  if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
    return next();
  }

  const courseOfferingId = req.params.offeringId || req.body.courseOfferingId;
  if (!courseOfferingId) {
    return res.status(400).json({ success: false, message: 'የኮርስ ምደባ መለያ (Offering ID) አልተገለጸም።' });
  }

  if (req.user.role === UserRole.TEACHER) {
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        courseOfferingId,
        teacher: { userId: req.user.id },
      },
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'ይህ ኮርስ ለእርስዎ አልተመደበም። የውጤት መረጃ የመመልከት ወይም የመመዝገብ ፈቃድ የለዎትም።',
      });
    }

    return next();
  }

  // Other roles not permitted
  return res.status(403).json({
    success: false,
    message: 'ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም።',
  });
};
