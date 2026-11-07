import prisma from '../config/prisma.client.js';
import { GradeSubmissionStatus, ApprovalDecision, Gender } from '@prisma/client';

export interface ReportFilterOptions {
  academicYearId?: string;
  batchId?: string;
  courseId?: string;
  teacherId?: string;
  studentId?: string;
  search?: string;
}

export class ReportService {
  /**
   * 1. Total Students by Academic Year
   */
  async getStudentsByAcademicYear(filters: ReportFilterOptions = {}) {
    const years = await prisma.academicYear.findMany({
      where: filters.academicYearId ? { id: filters.academicYearId } : {},
      include: {
        registrations: {
          include: {
            student: {
              include: { user: true, batch: true },
            },
          },
        },
        batches: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return years.map((y) => {
      const maleCount = y.registrations.filter((r) => r.student.gender === Gender.MALE).length;
      const femaleCount = y.registrations.filter((r) => r.student.gender === Gender.FEMALE).length;
      const activeCount = y.registrations.filter((r) => r.status === 'ACTIVE').length;
      const promotedCount = y.registrations.filter((r) => r.status === 'PROMOTED').length;

      return {
        academicYearId: y.id,
        academicYearName: y.name,
        code: y.code,
        isCurrent: y.isCurrent,
        status: y.status,
        totalBatches: y.batches.length,
        totalStudents: y.registrations.length,
        maleStudents: maleCount,
        femaleStudents: femaleCount,
        activeStudents: activeCount,
        promotedStudents: promotedCount,
        students: y.registrations.map((r) => ({
          studentId: r.student.id,
          admissionNumber: r.student.admissionNumber,
          fullName: `${r.student.user.firstName} ${r.student.user.lastName}`,
          baptismalName: r.student.baptismalName,
          gender: r.student.gender === Gender.MALE ? 'ወንድ' : 'ሴት',
          batchName: r.student.batch.name,
          status: r.status,
          registeredAt: r.registeredAt,
        })),
      };
    });
  }

  /**
   * 2. Students by Batch
   */
  async getStudentsByBatch(filters: ReportFilterOptions = {}) {
    const batches = await prisma.batch.findMany({
      where: {
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.batchId ? { id: filters.batchId } : {}),
      },
      include: {
        academicYear: true,
        registrations: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
        courseOfferings: true,
      },
      orderBy: { name: 'asc' },
    });

    return batches.map((b) => {
      const maleCount = b.registrations.filter((r) => r.student.gender === Gender.MALE).length;
      const femaleCount = b.registrations.filter((r) => r.student.gender === Gender.FEMALE).length;

      return {
        batchId: b.id,
        batchName: b.name,
        code: b.code,
        stageLevel: b.stageLevel,
        academicYearId: b.academicYear.id,
        academicYearName: b.academicYear.name,
        totalCourses: b.courseOfferings.length,
        totalStudents: b.registrations.length,
        maleStudents: maleCount,
        femaleStudents: femaleCount,
        students: b.registrations.map((r) => ({
          studentId: r.student.id,
          admissionNumber: r.student.admissionNumber,
          fullName: `${r.student.user.firstName} ${r.student.user.lastName}`,
          baptismalName: r.student.baptismalName,
          gender: r.student.gender === Gender.MALE ? 'ወንድ' : 'ሴት',
          phone: r.student.user.phone,
          status: r.status,
        })),
      };
    });
  }

  /**
   * 3. Students by Course
   */
  async getStudentsByCourse(filters: ReportFilterOptions = {}) {
    const offerings = await prisma.courseOffering.findMany({
      where: {
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.batchId ? { batchId: filters.batchId } : {}),
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
      },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: { teacher: { include: { user: true } } },
        },
        enrollments: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
      orderBy: { course: { title: 'asc' } },
    });

    return offerings.map((off) => {
      const passedCount = off.enrollments.filter((e) => e.isPassed === true).length;
      const failedCount = off.enrollments.filter((e) => e.isPassed === false).length;
      const pendingCount = off.enrollments.filter((e) => e.isPassed === null).length;

      return {
        offeringId: off.id,
        courseId: off.course.id,
        courseTitle: off.course.amharicTitle || off.course.title,
        courseCode: off.course.code,
        creditHours: off.course.creditHours,
        academicYearName: off.academicYear.name,
        batchName: off.batch.name,
        teachers: off.teacherAssignments.map(
          (ta) => `${ta.teacher.spiritualTitle || ''} ${ta.teacher.user.firstName} ${ta.teacher.user.lastName}`.trim()
        ),
        totalEnrolled: off.enrollments.length,
        passedCount,
        failedCount,
        pendingCount,
        students: off.enrollments.map((e) => ({
          studentId: e.student.id,
          admissionNumber: e.student.admissionNumber,
          fullName: `${e.student.user.firstName} ${e.student.user.lastName}`,
          baptismalName: e.student.baptismalName,
          finalNumericScore: e.finalNumericScore ? Number(e.finalNumericScore) : null,
          finalLetterGrade: e.finalLetterGrade || '-',
          isPassed: e.isPassed,
        })),
      };
    });
  }

  /**
   * 4. Teacher Assignments Report
   */
  async getTeacherAssignments(filters: ReportFilterOptions = {}) {
    const teachers = await prisma.teacher.findMany({
      where: filters.teacherId ? { id: filters.teacherId } : {},
      include: {
        user: true,
        assignments: {
          include: {
            courseOffering: {
              include: {
                course: true,
                academicYear: true,
                batch: true,
                enrollments: true,
                gradeSubmissions: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });

    return teachers.map((t) => {
      let filteredAssignments = t.assignments;
      if (filters.academicYearId) {
        filteredAssignments = filteredAssignments.filter(
          (a) => a.courseOffering.academicYearId === filters.academicYearId
        );
      }
      if (filters.batchId) {
        filteredAssignments = filteredAssignments.filter(
          (a) => a.courseOffering.batchId === filters.batchId
        );
      }

      const totalStudents = filteredAssignments.reduce(
        (sum, a) => sum + a.courseOffering.enrollments.length,
        0
      );

      return {
        teacherId: t.id,
        teacherCode: t.teacherCode,
        fullName: `${t.spiritualTitle || ''} ${t.user.firstName} ${t.user.lastName}`.trim(),
        phone: t.user.phone,
        email: t.user.email,
        qualification: t.qualification || 'አልተጠቀሰም',
        specialization: t.specialization || 'አልተጠቀሰም',
        totalAssignedCourses: filteredAssignments.length,
        totalStudentsTaught: totalStudents,
        assignments: filteredAssignments.map((a) => {
          const latestSub = a.courseOffering.gradeSubmissions[0];
          return {
            assignmentId: a.id,
            isPrimary: a.isPrimary,
            courseName: a.courseOffering.course.amharicTitle || a.courseOffering.course.title,
            courseCode: a.courseOffering.course.code,
            academicYear: a.courseOffering.academicYear.name,
            batchName: a.courseOffering.batch.name,
            enrolledStudentsCount: a.courseOffering.enrollments.length,
            submissionStatus: latestSub ? latestSub.status : 'NOT_STARTED',
            gradeDeadline: a.courseOffering.gradeDeadline,
          };
        }),
      };
    });
  }

  /**
   * 5. Course-Wise Performance Report
   */
  async getCourseWisePerformance(filters: ReportFilterOptions = {}) {
    const offerings = await prisma.courseOffering.findMany({
      where: {
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.batchId ? { batchId: filters.batchId } : {}),
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
      },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        enrollments: true,
        gradeSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return offerings.map((off) => {
      const graded = off.enrollments.filter((e) => e.finalNumericScore !== null);
      const scores = graded.map((e) => Number(e.finalNumericScore));

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
      const passedCount = off.enrollments.filter((e) => e.isPassed === true).length;
      const passRate = graded.length > 0 ? Math.round((passedCount / graded.length) * 1000) / 10 : 0;

      // Grade breakdown
      const distribution: Record<string, number> = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
      for (const e of graded) {
        const letter = e.finalLetterGrade || 'F';
        if (distribution[letter] !== undefined) distribution[letter]++;
        else distribution['F']++;
      }

      const latestSub = off.gradeSubmissions[0];

      return {
        offeringId: off.id,
        courseName: off.course.amharicTitle || off.course.title,
        courseCode: off.course.code,
        academicYearName: off.academicYear.name,
        batchName: off.batch.name,
        totalEnrolled: off.enrollments.length,
        totalGraded: graded.length,
        averageScore: Math.round(avgScore * 100) / 100,
        highestScore: Math.round(highestScore * 100) / 100,
        lowestScore: Math.round(lowestScore * 100) / 100,
        passRate: `${passRate}%`,
        gradeDistribution: distribution,
        submissionStatus: latestSub ? latestSub.status : 'NOT_STARTED',
      };
    });
  }

  /**
   * 6. Batch-Wise Performance Report
   */
  async getBatchWisePerformance(filters: ReportFilterOptions = {}) {
    const batches = await prisma.batch.findMany({
      where: {
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.batchId ? { id: filters.batchId } : {}),
      },
      include: {
        academicYear: true,
        registrations: {
          include: { student: { include: { user: true, enrollments: true } } },
        },
        courseOfferings: {
          include: {
            enrollments: true,
          },
        },
      },
    });

    return batches.map((b) => {
      // Gather all enrollments across this batch
      const allEnrollments = b.courseOfferings.flatMap((o) => o.enrollments);
      const graded = allEnrollments.filter((e) => e.finalNumericScore !== null);
      const scores = graded.map((e) => Number(e.finalNumericScore));

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const passedCount = allEnrollments.filter((e) => e.isPassed === true).length;
      const passRate = graded.length > 0 ? Math.round((passedCount / graded.length) * 1000) / 10 : 0;

      // Identify top students in this batch
      const studentAverages = b.registrations.map((r) => {
        const studentEnrollments = r.student.enrollments.filter((e) => e.finalNumericScore !== null);
        const stuScores = studentEnrollments.map((e) => Number(e.finalNumericScore));
        const stuAvg = stuScores.length > 0 ? stuScores.reduce((a, b) => a + b, 0) / stuScores.length : 0;
        return {
          studentId: r.student.id,
          admissionNumber: r.student.admissionNumber,
          fullName: `${r.student.user.firstName} ${r.student.user.lastName}`,
          average: Math.round(stuAvg * 100) / 100,
          completedCourses: studentEnrollments.length,
        };
      });

      studentAverages.sort((a, b) => b.average - a.average);

      return {
        batchId: b.id,
        batchName: b.name,
        stageLevel: b.stageLevel,
        academicYearName: b.academicYear.name,
        totalStudents: b.registrations.length,
        totalCourses: b.courseOfferings.length,
        averageScore: Math.round(avgScore * 100) / 100,
        passRate: `${passRate}%`,
        topStudents: studentAverages.slice(0, 5),
      };
    });
  }

  /**
   * 7. Student Performance Report
   */
  async getStudentPerformance(filters: ReportFilterOptions = {}) {
    const students = await prisma.student.findMany({
      where: {
        ...(filters.studentId ? { id: filters.studentId } : {}),
        ...(filters.batchId ? { batchId: filters.batchId } : {}),
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.search
          ? {
              OR: [
                { admissionNumber: { contains: filters.search, mode: 'insensitive' } },
                { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
                { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        user: true,
        batch: true,
        academicYear: true,
        enrollments: {
          include: {
            courseOffering: { include: { course: true, academicYear: true } },
          },
        },
      },
    });

    const scales = await prisma.gradingScale.findMany();

    const results = students.map((s) => {
      let totalQualityPoints = 0;
      let totalCreditHours = 0;
      let gradedCoursesCount = 0;

      for (const en of s.enrollments) {
        if (en.finalNumericScore !== null && en.finalLetterGrade) {
          const scale = scales.find((sc) => sc.letterGrade === en.finalLetterGrade);
          const gp = scale ? Number(scale.gradePoint) : 0;
          const credits = en.courseOffering.course.creditHours;

          totalQualityPoints += gp * credits;
          totalCreditHours += credits;
          gradedCoursesCount++;
        }
      }

      const gpa = totalCreditHours > 0 ? totalQualityPoints / totalCreditHours : 0;

      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        fullName: `${s.user.firstName} ${s.user.lastName} ${s.user.grandfatherName || ''}`.trim(),
        baptismalName: s.baptismalName,
        gender: s.gender === Gender.MALE ? 'ወንድ' : 'ሴት',
        academicYearName: s.academicYear.name,
        batchName: s.batch.name,
        totalEnrolledCourses: s.enrollments.length,
        completedCoursesCount: gradedCoursesCount,
        totalEarnedCredits: totalCreditHours,
        gpa: Math.round(gpa * 100) / 100,
        distinction:
          gpa >= 3.75
            ? 'ከፍተኛ ማዕረግ (Great Distinction)'
            : gpa >= 3.5
            ? 'በማዕረግ (Distinction)'
            : gpa >= 2.0
            ? 'አጥጋቢ (Satisfactory)'
            : 'የሚሻሻል',
        courses: s.enrollments.map((en) => ({
          courseName: en.courseOffering.course.amharicTitle || en.courseOffering.course.title,
          courseCode: en.courseOffering.course.code,
          creditHours: en.courseOffering.course.creditHours,
          score: en.finalNumericScore ? Number(en.finalNumericScore) : null,
          letterGrade: en.finalLetterGrade || '-',
          isPassed: en.isPassed,
        })),
      };
    });

    // Sort by GPA descending
    results.sort((a, b) => b.gpa - a.gpa);
    return results;
  }

  /**
   * 8. Grade Submission Progress Report
   */
  async getGradeSubmissionProgress(filters: ReportFilterOptions = {}) {
    const offerings = await prisma.courseOffering.findMany({
      where: {
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.batchId ? { batchId: filters.batchId } : {}),
      },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: { teacher: { include: { user: true } } },
        },
        gradeSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const counts = {
      TOTAL: offerings.length,
      NOT_STARTED: 0,
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
      PUBLISHED: 0,
      OVERDUE: 0,
    };

    const now = new Date();

    const items = offerings.map((off) => {
      const latestSub = off.gradeSubmissions[0];
      const status = latestSub ? latestSub.status : 'NOT_STARTED';

      if (status === 'NOT_STARTED') counts.NOT_STARTED++;
      else if (status === GradeSubmissionStatus.DRAFT) counts.DRAFT++;
      else if (status === GradeSubmissionStatus.SUBMITTED) counts.SUBMITTED++;
      else if (status === GradeSubmissionStatus.APPROVED) counts.APPROVED++;
      else if (status === GradeSubmissionStatus.REJECTED) counts.REJECTED++;
      else if (status === GradeSubmissionStatus.PUBLISHED) counts.PUBLISHED++;

      const isOverdue = off.gradeDeadline && new Date(off.gradeDeadline) < now && status !== 'PUBLISHED' && status !== 'APPROVED';
      if (isOverdue) counts.OVERDUE++;

      return {
        offeringId: off.id,
        courseName: off.course.amharicTitle || off.course.title,
        courseCode: off.course.code,
        academicYear: off.academicYear.name,
        batchName: off.batch.name,
        teachers: off.teacherAssignments.map(
          (ta) => `${ta.teacher.spiritualTitle || ''} ${ta.teacher.user.firstName} ${ta.teacher.user.lastName}`.trim()
        ),
        submissionStatus: status,
        gradeDeadline: off.gradeDeadline,
        isOverdue: !!isOverdue,
        isSubmissionOpen: off.isSubmissionOpen,
      };
    });

    const completionRate =
      counts.TOTAL > 0
        ? Math.round(((counts.APPROVED + counts.PUBLISHED) / counts.TOTAL) * 1000) / 10
        : 0;

    return {
      summary: {
        ...counts,
        completionRate: `${completionRate}%`,
      },
      items,
    };
  }

  /**
   * 9. Approved and Rejected Grades Log
   */
  async getApprovedAndRejectedGrades(filters: ReportFilterOptions = {}) {
    const approvals = await prisma.gradeApproval.findMany({
      include: {
        approvedBy: true,
        gradeSubmission: {
          include: {
            submittedBy: true,
            courseOffering: {
              include: {
                course: true,
                academicYear: true,
                batch: true,
              },
            },
          },
        },
      },
      orderBy: { decidedAt: 'desc' },
    });

    let filtered = approvals;
    if (filters.academicYearId) {
      filtered = filtered.filter(
        (a) => a.gradeSubmission.courseOffering.academicYearId === filters.academicYearId
      );
    }
    if (filters.batchId) {
      filtered = filtered.filter(
        (a) => a.gradeSubmission.courseOffering.batchId === filters.batchId
      );
    }
    if (filters.courseId) {
      filtered = filtered.filter(
        (a) => a.gradeSubmission.courseOffering.courseId === filters.courseId
      );
    }

    return filtered.map((a) => ({
      approvalId: a.id,
      decision: a.decision,
      decidedAt: a.decidedAt,
      comments: a.comments,
      rejectionReason: a.decision === ApprovalDecision.REJECTED ? a.gradeSubmission.rejectionReason : null,
      courseName: a.gradeSubmission.courseOffering.course.amharicTitle || a.gradeSubmission.courseOffering.course.title,
      courseCode: a.gradeSubmission.courseOffering.course.code,
      academicYearName: a.gradeSubmission.courseOffering.academicYear.name,
      batchName: a.gradeSubmission.courseOffering.batch.name,
      submittedBy: `${a.gradeSubmission.submittedBy.firstName} ${a.gradeSubmission.submittedBy.lastName}`,
      decidedBy: `${a.approvedBy.firstName} ${a.approvedBy.lastName}`,
    }));
  }

  /**
   * 10. Student Multi-Year Academic History
   * Returns chronological snapshot across academic years & batches.
   * Prior records are never overwritten!
   */
  async getStudentAcademicHistory(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        registrations: {
          include: {
            academicYear: true,
            batch: true,
          },
          orderBy: { academicYear: { startDate: 'asc' } },
        },
        enrollments: {
          include: {
            courseOffering: {
              include: {
                course: true,
                academicYear: true,
                batch: true,
                gradeSubmissions: {
                  where: { status: GradeSubmissionStatus.PUBLISHED },
                },
              },
            },
            grades: {
              include: { assessment: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error('የተማሪው መረጃ አልተገኘም።');
    }

    const scales = await prisma.gradingScale.findMany();

    // Group enrollments by academic year and batch
    const historyTerms: Array<{
      academicYearId: string;
      academicYearName: string;
      batchName: string;
      stageLevel: string;
      registrationStatus: string;
      registeredAt: Date;
      courses: Array<{
        courseId: string;
        courseName: string;
        courseCode: string;
        creditHours: number;
        totalScore: number | null;
        letterGrade: string;
        amharicLabel: string;
        isPassed: boolean | null;
        assessments: Array<{
          name: string;
          score: number;
          maxScore: number;
          weight: number;
        }>;
      }>;
      termCreditHours: number;
      termGpa: number;
    }> = [];

    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    for (const reg of student.registrations) {
      const yearId = reg.academicYearId;
      const batchId = reg.batchId;

      // Filter enrollments for this year and batch
      const termEnrollments = student.enrollments.filter(
        (e) =>
          e.courseOffering.academicYearId === yearId &&
          e.courseOffering.batchId === batchId
      );

      let termPoints = 0;
      let termCredits = 0;

      const courses = termEnrollments.map((en) => {
        const isPublished = en.courseOffering.gradeSubmissions.length > 0;
        const credits = en.courseOffering.course.creditHours;
        const score = isPublished && en.finalNumericScore !== null ? Number(en.finalNumericScore) : null;
        const letter = isPublished && en.finalLetterGrade ? en.finalLetterGrade : '-';

        const scale = scales.find((s) => s.letterGrade === letter);
        const amharicLabel = scale ? scale.amharicLabel : (isPublished ? '-' : 'በመማር ላይ');

        if (score !== null && scale) {
          termPoints += Number(scale.gradePoint) * credits;
          termCredits += credits;
        }

        return {
          courseId: en.courseOffering.course.id,
          courseName: en.courseOffering.course.amharicTitle || en.courseOffering.course.title,
          courseCode: en.courseOffering.course.code,
          creditHours: credits,
          totalScore: score,
          letterGrade: letter,
          amharicLabel,
          isPassed: isPublished ? en.isPassed : null,
          assessments: isPublished
            ? en.grades.map((g) => ({
                name: g.assessment.name,
                score: Number(g.scoreObtained),
                maxScore: Number(g.assessment.maxScore),
                weight: Number(g.assessment.weightPercentage),
              }))
            : [],
        };
      });

      const termGpa = termCredits > 0 ? termPoints / termCredits : 0;
      cumulativePoints += termPoints;
      cumulativeCredits += termCredits;

      historyTerms.push({
        academicYearId: reg.academicYear.id,
        academicYearName: reg.academicYear.name,
        batchName: reg.batch.name,
        stageLevel: reg.batch.stageLevel,
        registrationStatus: reg.status,
        registeredAt: reg.registeredAt,
        courses,
        termCreditHours: termCredits,
        termGpa: Math.round(termGpa * 100) / 100,
      });
    }

    const cumulativeGpa = cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.user.firstName} ${student.user.lastName} ${student.user.grandfatherName || ''}`.trim(),
        baptismalName: student.baptismalName,
        gender: student.gender === Gender.MALE ? 'ወንድ' : 'ሴት',
        phone: student.user.phone,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
      },
      summary: {
        totalTerms: historyTerms.length,
        cumulativeCredits,
        cumulativeGpa: Math.round(cumulativeGpa * 100) / 100,
        distinction:
          cumulativeGpa >= 3.75
            ? 'ከፍተኛ ማዕረግ (Great Distinction)'
            : cumulativeGpa >= 3.5
            ? 'በማዕረግ (Distinction)'
            : cumulativeGpa >= 2.0
            ? 'አጥጋቢ (Satisfactory)'
            : 'የሚሻሻል',
      },
      historyTerms,
    };
  }

  /**
   * Helper to format report datasets into Excel-compatible CSV with UTF-8 BOM
   */
  generateExcelCsv(headers: string[], rows: (string | number)[][]): string {
    const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for Microsoft Excel Ethiopic support
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsv).join(',');
    const rowLines = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');

    return `${BOM}${headerLine}\n${rowLines}`;
  }
}

export default new ReportService();
