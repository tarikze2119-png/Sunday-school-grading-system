import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../config/prisma.client.js';

/**
 * Ensures students can only access their own student records.
 * Teachers can only access students enrolled in at least one course assigned to that teacher.
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

  let requestedStudentId = (req.params.studentId || req.query.studentId) as string;

  // 1. Student Role: Strict Self-Access Only
  if (req.user.role === UserRole.STUDENT) {
    if (requestedStudentId === 'me') {
      return next();
    }

    let myStudentId = req.user.studentId;
    if (!myStudentId) {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      myStudentId = studentProfile?.id;
    }

    if (myStudentId && myStudentId === requestedStudentId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'የሌላ ተማሪን መረጃ የመመልከት ፈቃድ የለዎትም።',
    });
  }

  // 2. Teacher Role: Course Assignment & Enrollment Context Verification
  if (req.user.role === UserRole.TEACHER) {
    if (!requestedStudentId || requestedStudentId === 'me') {
      return res.status(400).json({
        success: false,
        message: 'የተማሪ መለያ አልተገለጸም።',
      });
    }

    // Verify database relationship: Teacher must be assigned to at least one course
    // offering in which the requested student is enrolled.
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacher: { userId: req.user.id },
        courseOffering: {
          enrollments: {
            some: { studentId: requestedStudentId },
          },
        },
      },
      select: {
        courseOfferingId: true,
      },
    });

    if (assignments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'መምህሩ ይህንን ተማሪ የሚያስተምሩበት የኮርስ ምደባ የለም።',
      });
    }

    // Attach verified offering IDs to request object for strict service-level scoping
    (req as any).allowedOfferingIds = assignments.map((a) => a.courseOfferingId);
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'ይህንን መረጃ የመመልከት ፈቃድ የለዎትም።',
  });
};

/**
 * Ensures teachers can only view or mutate grades of course offerings assigned to them.
 * Admins and Super Admins can view course offerings and reports for review, but CANNOT mutate teacher grades.
 * Management has read-only oversight to aggregated reports, but is strictly barred from individual grade sheets.
 */
export const verifyTeacherCourseAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'እባክዎ መጀመሪያ ይግቡ።' });
  }

  const courseOfferingId = req.params.offeringId || req.body.courseOfferingId;
  if (!courseOfferingId) {
    return res.status(400).json({ success: false, message: 'የኮርስ ምደባ መለያ (Offering ID) አልተገለጸም።' });
  }

  // 1. Management: Strictly read-only for aggregated reports; barred from individual grade sheets and mutations
  if (req.user.role === UserRole.MANAGEMENT) {
    if (req.method !== 'GET') {
      return res.status(403).json({
        success: false,
        message: 'የሰንበት ት/ቤት አመራር ውጤት የማሻሻል ወይም የማስገባት ፈቃድ የለውም።',
        code: 'FORBIDDEN',
      });
    }

    const isSheetEndpoint =
      req.path.endsWith('/sheet') ||
      req.originalUrl.includes('/sheet') ||
      req.baseUrl.includes('sheet');

    if (isSheetEndpoint) {
      return res.status(403).json({
        success: false,
        message: 'የሰንበት ት/ቤት አመራር የተማሪዎችን ዝርዝር የውጤት መሙያ ሰነድ የመመልከት ፈቃድ የለውም። እባክዎ አጠቃላይ የአካዳሚክ ሪፖርቶችን ይጠቀሙ።',
        code: 'FORBIDDEN_MANAGEMENT_SHEET_ACCESS',
      });
    }

    return next();
  }

  // 2. Admins and Super Admins: Read-only access for review & reports; strictly forbidden from grade entry/submission
  if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
    if (req.method !== 'GET') {
      return res.status(403).json({
        success: false,
        message: 'አስተዳዳሪዎች በቀጥታ የመምህራንን ውጤት መመዝገብ ወይም ማቅረብ አይችሉም። ይህ የመምህሩ ብቻ ኃላፊነት ነው።',
        code: 'FORBIDDEN_ADMIN_GRADE_MUTATION',
      });
    }
    return next();
  }

  // 3. Teachers: Must be actively assigned to this offering with an active, non-deleted account
  if (req.user.role === UserRole.TEACHER) {
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        courseOfferingId,
        teacher: {
          userId: req.user.id,
          user: {
            isActive: true,
            isDeleted: false,
          },
        },
      },
      include: {
        courseOffering: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'ይህ ኮርስ ለእርስዎ አልተመደበም ወይም የተሰናከለ አካውንት ነው። የውጤት መረጃ የመመልከት ወይም የመመዝገብ ፈቃድ የለዎትም።',
        code: 'NOT_ASSIGNED_TEACHER',
      });
    }

    if (assignment.courseOffering.status === 'COMPLETED' || assignment.courseOffering.status === 'ARCHIVED') {
      if (req.method !== 'GET') {
        return res.status(403).json({
          success: false,
          message: 'ይህ የኮርስ ምደባ የተጠናቀቀ ወይም የተሰረዘ ስለሆነ ውጤት ማስገባት አይቻልም።',
          code: 'OFFERING_INACTIVE',
        });
      }
    }

    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም።',
    code: 'FORBIDDEN',
  });
};
