import prisma from '../config/prisma.client.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export class EnrollmentService {
  /**
   * Enroll an individual student into a Course Offering
   */
  async enrollStudent(courseOfferingId: string, studentId: string, operatorId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: { course: true, batch: true },
    });

    if (!offering) {
      const error: any = new Error('የኮርስ ምደባው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      const error: any = new Error('ተማሪው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Check duplicate enrollment (Rule 10)
    const existing = await prisma.studentEnrollment.findUnique({
      where: {
        studentId_courseOfferingId: {
          studentId,
          courseOfferingId,
        },
      },
    });

    if (existing) {
      const error: any = new Error('ተማሪው አስቀድሞ በዚህ ኮርስ ውስጥ ተመዝግቧል።');
      error.statusCode = 400;
      throw error;
    }

    const enrollment = await prisma.studentEnrollment.create({
      data: {
        courseOfferingId,
        studentId,
      },
      include: {
        student: { include: { user: true } },
        courseOffering: { include: { course: true } },
      },
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'ENROLL_STUDENT',
      entityName: 'StudentEnrollment',
      entityId: enrollment.id,
      details: {
        student: `${student.user.firstName} ${student.user.lastName}`,
        course: offering.course.amharicTitle,
        batch: offering.batch.name,
      },
    });

    return enrollment;
  }

  /**
   * Bulk enroll ALL students of a Batch into a Course Offering
   */
  async bulkEnrollBatchStudents(courseOfferingId: string, operatorId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: { course: true, batch: true },
    });

    if (!offering) {
      const error: any = new Error('የኮርስ ምደባው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Find all active students in this batch
    const students = await prisma.student.findMany({
      where: {
        batchId: offering.batchId,
        user: { isActive: true },
      },
      select: { id: true },
    });

    if (students.length === 0) {
      return {
        message: 'በዚህ ምድብ ውስጥ የተመዘገበ ተማሪ አልተገኘም።',
        enrolledCount: 0,
        skippedCount: 0,
      };
    }

    // Find already enrolled students
    const existingEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        courseOfferingId,
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true },
    });

    const alreadyEnrolledIds = new Set(existingEnrollments.map((e) => e.studentId));
    const studentsToEnroll = students.filter((s) => !alreadyEnrolledIds.has(s.id));

    if (studentsToEnroll.length === 0) {
      return {
        message: 'ሁሉም የተማሪዎች ምድብ አባላት አስቀድመው በዚህ ኮርስ ተመዝግበዋል።',
        enrolledCount: 0,
        skippedCount: students.length,
      };
    }

    // Batch insert
    await prisma.studentEnrollment.createMany({
      data: studentsToEnroll.map((s) => ({
        courseOfferingId,
        studentId: s.id,
      })),
      skipDuplicates: true,
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'BULK_ENROLL_STUDENTS',
      entityName: 'CourseOffering',
      entityId: courseOfferingId,
      details: {
        course: offering.course.amharicTitle,
        batch: offering.batch.name,
        count: studentsToEnroll.length,
      },
    });

    return {
      message: `${studentsToEnroll.length} ተማሪዎች ወደ '${offering.course.amharicTitle}' በተሳካ ሁኔታ ተመዝግበዋል።`,
      enrolledCount: studentsToEnroll.length,
      skippedCount: alreadyEnrolledIds.size,
    };
  }

  /**
   * Get all students enrolled in a Course Offering
   */
  async getOfferingEnrollments(courseOfferingId: string) {
    return prisma.studentEnrollment.findMany({
      where: { courseOfferingId },
      orderBy: { student: { admissionNumber: 'asc' } },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            batch: { select: { name: true } },
          },
        },
        _count: { select: { grades: true } },
      },
    });
  }

  /**
   * Transfer student from one course offering to another
   */
  async transferStudent(
    studentId: string,
    fromOfferingId: string,
    toOfferingId: string,
    operatorId: string
  ) {
    const existingEnrollment = await prisma.studentEnrollment.findUnique({
      where: {
        studentId_courseOfferingId: {
          studentId,
          courseOfferingId: fromOfferingId,
        },
      },
      include: {
        grades: true,
      },
    });

    if (!existingEnrollment) {
      const error: any = new Error('ተማሪው በነባሩ ኮርስ ውስጥ አልተመዘገበም።');
      error.statusCode = 404;
      throw error;
    }

    if (existingEnrollment.grades.length > 0) {
      const error: any = new Error('ተማሪው በነባሩ ኮርስ ውስጥ የውጤት መዛግብት ስላሉት በቀጥታ ማዛወር አይቻልም።');
      error.statusCode = 400;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentEnrollment.delete({ where: { id: existingEnrollment.id } });
      await tx.studentEnrollment.create({
        data: {
          studentId,
          courseOfferingId: toOfferingId,
        },
      });
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'TRANSFER_STUDENT_ENROLLMENT',
      entityName: 'StudentEnrollment',
      entityId: studentId,
      details: { fromOfferingId, toOfferingId },
    });

    return { message: 'ተማሪው በተሳካ ሁኔታ ወደ አዲሱ ኮርስ ተዛውሯል።' };
  }

  /**
   * Unenroll student if no grades recorded
   */
  async unenrollStudent(enrollmentId: string, operatorId: string) {
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { _count: { select: { grades: true } } },
    });

    if (!enrollment) {
      const error: any = new Error('የተማሪው ምዝገባ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    if (enrollment._count.grades > 0) {
      const error: any = new Error('ተማሪው የውጤት መዛግብት ስላሉት ምዝገባውን መሰረዝ አይቻልም።');
      error.statusCode = 400;
      throw error;
    }

    await prisma.studentEnrollment.delete({ where: { id: enrollmentId } });

    await logAuditEvent({
      userId: operatorId,
      action: 'UNENROLL_STUDENT',
      entityName: 'StudentEnrollment',
      entityId: enrollmentId,
    });

    return { message: 'የተማሪው የኮርስ ምዝገባ ተሰርዟል።' };
  }
}

export const enrollmentService = new EnrollmentService();
export default enrollmentService;
