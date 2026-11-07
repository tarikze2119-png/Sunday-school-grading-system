import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.client.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { UserRole, Gender } from '@prisma/client';

export interface RegisterStudentInput {
  academicYearId: string;
  batchId: string;
  admissionNumber?: string;
  username?: string;
  firstName: string;
  lastName: string;
  grandfatherName?: string;
  baptismalName?: string;
  gender: Gender;
  dateOfBirth?: string | Date;
  phone?: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContact?: string;
  address?: string;
  password?: string;
}

export class StudentService {
  /**
   * Register a new student under an Academic Year & Batch
   */
  async registerStudent(input: RegisterStudentInput, operatorId: string) {
    const year = await prisma.academicYear.findUnique({ where: { id: input.academicYearId } });
    const batch = await prisma.batch.findUnique({ where: { id: input.batchId } });

    if (!year || !batch) {
      const error: any = new Error('የተመረጠው የትምህርት ዘመን ወይም ምድብ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    if (batch.academicYearId !== year.id) {
      const error: any = new Error('ምድቡ ከተመረጠው የትምህርት ዘመን ጋር አይዛመድም።');
      error.statusCode = 400;
      throw error;
    }

    // Auto-generate Admission Number if not provided
    const admissionNumber =
      input.admissionNumber?.trim() ||
      `STU-${year.code.replace('AY-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Auto-generate unique username if not provided
    const baseUsername =
      input.username?.trim().toLowerCase() ||
      `stu_${admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const existingAdmission = await prisma.student.findUnique({ where: { admissionNumber } });
    if (existingAdmission) {
      const error: any = new Error(`የተማሪ መለያ ቁጥር '${admissionNumber}' አስቀድሞ በሲስተሙ ተመዝግቧል።`);
      error.statusCode = 400;
      throw error;
    }

    // Default password: Student@2026
    const password = input.password || 'Student@2026';
    const passwordHash = await bcrypt.hash(password, 12);

    const studentRecord = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          username: baseUsername,
          email: input.email ? input.email.trim().toLowerCase() : null,
          phone: input.phone ? input.phone.trim() : null,
          passwordHash,
          role: UserRole.STUDENT,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          grandfatherName: input.grandfatherName ? input.grandfatherName.trim() : null,
          isActive: true,
        },
      });

      // 2. Create Student Profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          academicYearId: year.id,
          batchId: batch.id,
          admissionNumber,
          baptismalName: input.baptismalName ? input.baptismalName.trim() : null,
          gender: input.gender || Gender.MALE,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          guardianName: input.guardianName ? input.guardianName.trim() : null,
          guardianPhone: input.guardianPhone ? input.guardianPhone.trim() : null,
          emergencyContact: input.emergencyContact ? input.emergencyContact.trim() : null,
          address: input.address ? input.address.trim() : null,
        },
        include: {
          user: { select: { id: true, username: true, firstName: true, lastName: true } },
          batch: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
        },
      });

      // 3. Create Student Registration record for historical tracking
      await tx.studentRegistration.create({
        data: {
          studentId: student.id,
          academicYearId: year.id,
          batchId: batch.id,
          status: 'ACTIVE',
        },
      });

      return student;
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'REGISTER_STUDENT',
      entityName: 'Student',
      entityId: studentRecord.id,
      details: {
        admissionNumber: studentRecord.admissionNumber,
        batch: batch.name,
        year: year.name,
      },
    });

    // Notify Student of Registration
    await prisma.notification.create({
      data: {
        userId: studentRecord.userId,
        type: 'REGISTRATION_CONFIRMED',
        title: 'የትምህርት ዘመን ምዝገባ ማረጋገጫ',
        message: `በትምህርት ዘመን ${year.name} በ${batch.name} ምዝገባዎ ተረጋግጧል።`,
        linkUrl: '/dashboard',
      },
    }).catch(() => {});

    return studentRecord;
  }

  /**
   * List Students with search & filters
   */
  async listStudents(filters: {
    academicYearId?: string;
    batchId?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }
    if (filters.batchId) {
      where.batchId = filters.batchId;
    }
    if (filters.isActive !== undefined) {
      where.user = { isActive: filters.isActive };
    }
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { admissionNumber: { contains: q, mode: 'insensitive' } },
        { baptismalName: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { username: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              grandfatherName: true,
              isActive: true,
            },
          },
          academicYear: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, stageLevel: true } },
          registrations: {
            include: {
              academicYear: { select: { name: true } },
              batch: { select: { name: true } },
            },
          },
          _count: { select: { enrollments: true, grades: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      students,
    };
  }

  /**
   * Promote Student into a new Academic Year and Batch WITHOUT overwriting historical records
   */
  async promoteStudent(
    studentId: string,
    newAcademicYearId: string,
    newBatchId: string,
    operatorId: string
  ) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { academicYear: true, batch: true },
    });

    if (!student) {
      const error: any = new Error('ተማሪው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    const newYear = await prisma.academicYear.findUnique({ where: { id: newAcademicYearId } });
    const newBatch = await prisma.batch.findUnique({ where: { id: newBatchId } });

    if (!newYear || !newBatch) {
      const error: any = new Error('አዲሱ የትምህርት ዘመን ወይም ምድብ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Check if already registered in new year
    const existingReg = await prisma.studentRegistration.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: newAcademicYearId,
        },
      },
    });

    if (existingReg) {
      const error: any = new Error('ይህ ተማሪ አስቀድሞ በዚህ የትምህርት ዘመን ውስጥ ተመዝግቧል።');
      error.statusCode = 400;
      throw error;
    }

    // Transaction preserves historical registration and updates current cohort pointer
    await prisma.$transaction(async (tx) => {
      // Mark old registration as PROMOTED
      await tx.studentRegistration.updateMany({
        where: { studentId, academicYearId: student.academicYearId },
        data: { status: 'PROMOTED' },
      });

      // Create new registration for new year
      await tx.studentRegistration.create({
        data: {
          studentId,
          academicYearId: newAcademicYearId,
          batchId: newBatchId,
          status: 'ACTIVE',
        },
      });

      // Update student profile pointers to current year/batch
      await tx.student.update({
        where: { id: studentId },
        data: {
          academicYearId: newAcademicYearId,
          batchId: newBatchId,
        },
      });
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'PROMOTE_STUDENT',
      entityName: 'Student',
      entityId: studentId,
      details: {
        previousYear: student.academicYear.name,
        newYear: newYear.name,
        previousBatch: student.batch.name,
        newBatch: newBatch.name,
      },
    });

    // Notify Student of Promotion
    await prisma.notification.create({
      data: {
        userId: student.userId,
        type: 'REGISTRATION_CONFIRMED',
        title: 'ወደ አዲስ የትምህርት ዘመን ማለፍ/መዛወር ማረጋገጫ',
        message: `እንኳን ደስ አለዎት! ወደ '${newYear.name}' - '${newBatch.name}' በተሳካ ሁኔታ ተዛውረዋል። የቀደመ የትምህርት ታሪክዎ ሳይለወጥ ተጠብቋል።`,
        linkUrl: '/dashboard',
      },
    }).catch(() => {});

    return {
      message: `ተማሪው ወደ '${newYear.name}' - '${newBatch.name}' በተሳካ ሁኔታ ተዛውሯል/አልፏል። የታሪክ መዛግብት ተጠብቀዋል።`,
    };
  }

  /**
   * Bulk Import Students (CSV / Excel format)
   */
  async bulkImportStudents(
    academicYearId: string,
    batchId: string,
    rows: Array<{
      firstName: string;
      lastName: string;
      grandfatherName?: string;
      baptismalName?: string;
      gender?: string;
      phone?: string;
      guardianName?: string;
      guardianPhone?: string;
    }>,
    operatorId: string
  ) {
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.firstName || !row.lastName) {
        errors.push(`ረድፍ ${i + 1}፡ የመጀመሪያ እና የአባት ስም አልተሟላም`);
        continue;
      }

      try {
        await this.registerStudent(
          {
            academicYearId,
            batchId,
            firstName: row.firstName,
            lastName: row.lastName,
            grandfatherName: row.grandfatherName,
            baptismalName: row.baptismalName,
            gender: row.gender?.toLowerCase() === 'female' || row.gender === 'ሴት' ? Gender.FEMALE : Gender.MALE,
            phone: row.phone,
            guardianName: row.guardianName,
            guardianPhone: row.guardianPhone,
          },
          operatorId
        );
        successCount++;
      } catch (err: any) {
        errors.push(`ረድፍ ${i + 1} (${row.firstName} ${row.lastName})፡ ${err.message}`);
      }
    }

    return {
      totalRows: rows.length,
      successCount,
      failedCount: errors.length,
      errors,
    };
  }

  /**
   * Export Student list to UTF-8 CSV
   */
  async exportStudentsCSV(academicYearId?: string, batchId?: string) {
    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (batchId) where.batchId = batchId;

    const students = await prisma.student.findMany({
      where,
      orderBy: { admissionNumber: 'asc' },
      include: {
        user: true,
        batch: true,
        academicYear: true,
      },
    });

    const headers = [
      'የተማሪ መለያ ቁጥር',
      'መጠሪያ ስም',
      'የአባት ስም',
      'የአያት ስም',
      'የክርስትና ስም',
      'ጾታ',
      'ስልክ',
      'የወላጅ/አሳዳጊ ስም',
      'የወላጅ ስልክ',
      'ምድብ',
      'የትምህርት ዘመን',
    ];

    const csvRows = [headers.join(',')];

    for (const s of students) {
      const row = [
        s.admissionNumber,
        `"${s.user.firstName}"`,
        `"${s.user.lastName}"`,
        `"${s.user.grandfatherName || ''}"`,
        `"${s.baptismalName || ''}"`,
        s.gender === Gender.FEMALE ? 'ሴት' : 'ወንድ',
        s.user.phone || '',
        `"${s.guardianName || ''}"`,
        s.guardianPhone || '',
        `"${s.batch.name}"`,
        `"${s.academicYear.name}"`,
      ];
      csvRows.push(row.join(','));
    }

    // UTF-8 BOM so Excel opens Amharic characters perfectly
    return '\uFEFF' + csvRows.join('\r\n');
  }
}

export const studentService = new StudentService();
export default studentService;
