import prisma from '../config/prisma.client.js';
import { GradeSubmissionStatus, UserRole } from '@prisma/client';

export interface OfficialTranscriptStudent {
  id: string;
  admissionNumber: string;
  fullName: string;
  baptismalName?: string | null;
  gender: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

export interface OfficialTranscriptCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  totalScore: number | null;
  letterGrade: string;
  amharicLabel: string;
  gradePoint: number;
  isPassed: boolean | null;
}

export interface OfficialTranscriptTerm {
  academicYearId: string;
  academicYearName: string;
  batchName: string;
  stageLevel: string;
  termSemester?: string;
  registrationStatus: string;
  registeredAt: Date | string;
  courses: OfficialTranscriptCourse[];
  termCreditHours: number;
  termCredits: number;
  termGpa: number;
}

export interface OfficialTranscriptSummary {
  totalTerms: number;
  cumulativeCredits: number;
  cumulativeGpa: number;
  distinction: string;
}

export interface OfficialTranscriptPublicationInfo {
  status: 'NOT_PREPARED' | 'PREPARED' | 'PUBLISHED';
  versionNumber?: number | null;
  targetVersionNumber?: number | null;
  isDraft?: boolean;
  isHistorical?: boolean;
  preparedAt: string | null;
  preparedById: string | null;
  preparedByName: string | null;
  publishedAt: string | null;
  publishedById: string | null;
  publishedByName: string | null;
  notes: string | null;
}

export interface ActiveTranscriptDraft {
  preparedAt: string;
  preparedById: string | null;
  preparedByName: string;
  targetVersionNumber: number;
  notes?: string | null;
  snapshot: any;
}

export interface AvailableTranscriptVersion {
  versionNumber: number;
  publishedAt: string;
  publishedByName: string;
  notes?: string | null;
  id: string;
}

export interface OfficialTranscriptDocument {
  student: OfficialTranscriptStudent;
  summary: OfficialTranscriptSummary;
  historyTerms: OfficialTranscriptTerm[];
  academicTerms: OfficialTranscriptTerm[];
  cumulativeGpa: number;
  totalCreditsEarned: number;
  publication: OfficialTranscriptPublicationInfo;
  activeDraft?: ActiveTranscriptDraft | null;
  availableVersions?: AvailableTranscriptVersion[];
  publicationHistory: Array<{
    id: string;
    action: string;
    createdAt: Date;
    adminName: string;
    status: string;
    versionNumber?: number | null;
    notes?: string;
    snapshot?: any;
  }>;
}

const DEFAULT_GRADING_SCALES = [
  { letterGrade: 'A+', minScore: 90, maxScore: 100, gradePoint: 4.0, amharicLabel: 'እጅግ በጣም ጥሩ', isPassing: true },
  { letterGrade: 'A', minScore: 85, maxScore: 89.99, gradePoint: 4.0, amharicLabel: 'በጣም ጥሩ', isPassing: true },
  { letterGrade: 'A-', minScore: 80, maxScore: 84.99, gradePoint: 3.75, amharicLabel: 'በጣም ጥሩ', isPassing: true },
  { letterGrade: 'B+', minScore: 75, maxScore: 79.99, gradePoint: 3.5, amharicLabel: 'ጥሩ', isPassing: true },
  { letterGrade: 'B', minScore: 70, maxScore: 74.99, gradePoint: 3.0, amharicLabel: 'ጥሩ', isPassing: true },
  { letterGrade: 'B-', minScore: 65, maxScore: 69.99, gradePoint: 2.75, amharicLabel: 'ጥሩ', isPassing: true },
  { letterGrade: 'C+', minScore: 60, maxScore: 64.99, gradePoint: 2.5, amharicLabel: 'አጥጋቢ', isPassing: true },
  { letterGrade: 'C', minScore: 50, maxScore: 59.99, gradePoint: 2.0, amharicLabel: 'አጥጋቢ', isPassing: true },
  { letterGrade: 'D', minScore: 40, maxScore: 49.99, gradePoint: 1.0, amharicLabel: 'ዝቅተኛ', isPassing: false },
  { letterGrade: 'F', minScore: 0, maxScore: 39.99, gradePoint: 0.0, amharicLabel: 'የወደቀ', isPassing: false },
];

function matchScoreToScale(score: number, scales: any[]) {
  const rounded = Math.round(score * 100) / 100;
  for (const s of scales) {
    const min = Number(s.minScore);
    const max = Number(s.maxScore);
    if (rounded >= min && rounded <= max) {
      return s;
    }
  }
  return scales[scales.length - 1] || DEFAULT_GRADING_SCALES[DEFAULT_GRADING_SCALES.length - 1];
}

export class TranscriptService {
  /**
   * Internal helper: computes raw transcript records from published academic records in DB
   */
  public async computeRawTranscript(studentId: string) {
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
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error('የተማሪው መረጃ አልተገኘም።');
    }

    const rawScales = await prisma.gradingScale.findMany({ orderBy: { displayOrder: 'asc' } });
    const scales = rawScales.length > 0 ? rawScales : DEFAULT_GRADING_SCALES;

    const terms: OfficialTranscriptTerm[] = [];
    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    for (const reg of student.registrations) {
      const yearId = reg.academicYearId;
      const batchId = reg.batchId;

      const termEnrollments = student.enrollments.filter(
        (e) =>
          e.courseOffering.academicYearId === yearId &&
          e.courseOffering.batchId === batchId
      );

      let termPoints = 0;
      let termCredits = 0;

      const courses: OfficialTranscriptCourse[] = termEnrollments.map((en) => {
        const isPublished = en.courseOffering.gradeSubmissions.length > 0;
        const credits = en.courseOffering.course.creditHours;
        const score = isPublished && en.finalNumericScore !== null ? Number(en.finalNumericScore) : null;
        let letter = isPublished && en.finalLetterGrade ? en.finalLetterGrade : '-';

        let scale: any = scales.find((s) => s.letterGrade === letter);
        let effectivePassed = isPublished ? en.isPassed : null;

        if (score !== null && (!scale || (letter === 'F' && score >= 50))) {
          const auto = matchScoreToScale(score, scales);
          letter = auto.letterGrade;
          effectivePassed = auto.isPassing;
          scale = scales.find((s) => s.letterGrade === letter) || auto;
        }

        const gradePoint = scale ? Number(scale.gradePoint) : 0;
        const amharicLabel = scale ? scale.amharicLabel : (isPublished ? '-' : 'በመማር ላይ');

        if (score !== null && scale) {
          termPoints += gradePoint * credits;
          termCredits += credits;
        }

        return {
          courseId: en.courseOffering.course.id,
          courseCode: en.courseOffering.course.code,
          courseName: en.courseOffering.course.amharicTitle || en.courseOffering.course.title,
          creditHours: credits,
          totalScore: score,
          letterGrade: letter,
          amharicLabel,
          gradePoint,
          isPassed: effectivePassed,
        };
      });

      const termGpa = termCredits > 0 ? Math.round((termPoints / termCredits) * 100) / 100 : 0;
      cumulativePoints += termPoints;
      cumulativeCredits += termCredits;

      terms.push({
        academicYearId: yearId,
        academicYearName: reg.academicYear.name,
        batchName: reg.batch.name,
        stageLevel: reg.batch.stageLevel,
        termSemester: termEnrollments[0]?.courseOffering.termSemester || '1',
        registrationStatus: reg.status,
        registeredAt: reg.registeredAt,
        courses,
        termCreditHours: termCredits,
        termCredits,
        termGpa,
      });
    }

    const cumulativeGpa =
      cumulativeCredits > 0 ? Math.round((cumulativePoints / cumulativeCredits) * 100) / 100 : 0;

    let distinction = 'አጥጋቢ (Satisfactory)';
    if (cumulativeGpa >= 3.8) {
      distinction = 'ከፍተኛ ማዕረግ (Great Distinction)';
    } else if (cumulativeGpa >= 3.5) {
      distinction = 'በማዕረግ (Distinction)';
    } else if (cumulativeGpa < 2.0) {
      distinction = 'ዝቅተኛ (Probation)';
    }

    const studentInfo: OfficialTranscriptStudent = {
      id: student.id,
      admissionNumber: student.admissionNumber,
      fullName: `${student.user.firstName} ${student.user.lastName} ${student.user.grandfatherName || ''}`.trim(),
      baptismalName: student.baptismalName,
      gender: student.gender === 'MALE' ? 'ወንድ' : 'ሴት',
      phone: student.user.phone,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
    };

    const summary: OfficialTranscriptSummary = {
      totalTerms: terms.length,
      cumulativeCredits,
      cumulativeGpa,
      distinction,
    };

    return {
      student: studentInfo,
      summary,
      historyTerms: terms,
      academicTerms: terms,
      cumulativeGpa,
      totalCreditsEarned: cumulativeCredits,
    };
  }

  /**
   * Get official publication info from AuditLog
   */
  private async getPublicationLogs(studentId: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityName: 'OfficialTranscript',
        entityId: studentId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  /**
   * Analyzes student audit logs to separate:
   * 1. Published sequential versions (Version 1, Version 2, etc.)
   * 2. Active working draft (if any exists after publication/discard)
   * 3. Full publication history
   */
  private parseTranscriptState(logs: any[]) {
    // Extract published logs in chronological order (oldest to newest)
    const publishedLogsAsc = logs
      .filter((l) => l.action === 'PUBLISH_OFFICIAL_TRANSCRIPT')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Map each published log to an explicit sequential version number
    const availableVersions: AvailableTranscriptVersion[] = publishedLogsAsc.map((l, index) => {
      const d = (l.details as any) || {};
      const vNum = typeof d.versionNumber === 'number' ? d.versionNumber : index + 1;
      return {
        versionNumber: vNum,
        publishedAt: d.publishedAt || l.createdAt.toISOString(),
        publishedByName: l.user
          ? `${l.user.firstName} ${l.user.lastName}`
          : d.publishedByName || 'አስተዳዳሪ',
        notes: d.notes || null,
        id: l.id,
      };
    });

    const latestPublishLog = publishedLogsAsc.length > 0 ? publishedLogsAsc[publishedLogsAsc.length - 1] : null;
    const latestPublishDetails = latestPublishLog ? ((latestPublishLog.details as any) || {}) : null;
    const latestVersionNumber = latestPublishLog
      ? (typeof latestPublishDetails.versionNumber === 'number'
          ? latestPublishDetails.versionNumber
          : publishedLogsAsc.length)
      : null;

    // Identify latest prepare and discard actions
    const latestPrepareLog = logs.find((l) => l.action === 'PREPARE_OFFICIAL_TRANSCRIPT');
    const latestDiscardLog = logs.find((l) => l.action === 'DISCARD_OFFICIAL_TRANSCRIPT_DRAFT');

    // An active working draft exists only if:
    // 1. A prepare log exists
    // 2. Prepare happened after the latest publication (or no publication exists yet)
    // 3. Prepare happened after the latest discard (or no discard exists)
    const hasActiveDraft = !!(
      latestPrepareLog &&
      (!latestPublishLog ||
        new Date(latestPrepareLog.createdAt).getTime() > new Date(latestPublishLog.createdAt).getTime()) &&
      (!latestDiscardLog ||
        new Date(latestPrepareLog.createdAt).getTime() > new Date(latestDiscardLog.createdAt).getTime())
    );

    let activeDraft: ActiveTranscriptDraft | null = null;
    if (hasActiveDraft && latestPrepareLog) {
      const prepDetails = (latestPrepareLog.details as any) || {};
      activeDraft = {
        preparedAt: prepDetails.preparedAt || latestPrepareLog.createdAt.toISOString(),
        preparedById: latestPrepareLog.userId,
        preparedByName: latestPrepareLog.user
          ? `${latestPrepareLog.user.firstName} ${latestPrepareLog.user.lastName}`
          : prepDetails.preparedByName || 'አስተዳዳሪ',
        targetVersionNumber: (latestVersionNumber || 0) + 1,
        notes: prepDetails.notes || null,
        snapshot: prepDetails.snapshot || null,
      };
    }

    // Format full publication and workflow history
    const publicationHistory = logs.map((l) => {
      const d = (l.details as any) || {};
      let actionLabel = 'ለግምገማ ተዘጋጅቷል (Prepared)';
      if (l.action === 'PUBLISH_OFFICIAL_TRANSCRIPT') {
        actionLabel = `በይፋ ጸድቆ ታትሟል - ቅጽ ${d.versionNumber || ''} (Published)`;
      } else if (l.action === 'DISCARD_OFFICIAL_TRANSCRIPT_DRAFT') {
        actionLabel = 'ረቂቅ ሰነድ ተሰርዟል (Draft Discarded)';
      }

      return {
        id: l.id,
        action: l.action,
        createdAt: l.createdAt,
        adminName: l.user ? `${l.user.firstName} ${l.user.lastName}` : (d.publishedByName || d.preparedByName || 'አስተዳዳሪ'),
        status: d.status || (l.action === 'PUBLISH_OFFICIAL_TRANSCRIPT' ? 'PUBLISHED' : (l.action === 'DISCARD_OFFICIAL_TRANSCRIPT_DRAFT' ? 'DISCARDED' : 'PREPARED')),
        versionNumber: d.versionNumber || null,
        notes: d.notes || d.reason || null,
        snapshot: d.snapshot,
        actionLabel,
      };
    });

    return {
      publishedLogsAsc,
      availableVersions,
      latestPublishLog,
      latestPublishDetails,
      latestVersionNumber,
      latestPrepareLog,
      hasActiveDraft,
      activeDraft,
      publicationHistory,
    };
  }

  /**
   * Retrieves the Official Transcript document.
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT.
   * Strictly Forbidden to: STUDENT, TEACHER.
   *
   * KEY ARCHITECTURAL BEHAVIOR:
   * 1. If a published version exists, the PRIMARY return is ALWAYS the latest PUBLISHED version
   *    (preserving its sealed snapshot), even if an admin has prepared a subsequent draft!
   * 2. Any active working draft is exposed separately under `activeDraft`.
   * 3. All previous published versions are listed under `availableVersions`.
   */
  async getOfficialTranscript(
    studentId: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<OfficialTranscriptDocument> {
    if (
      requestingUserRole !== UserRole.ADMIN &&
      requestingUserRole !== UserRole.SUPER_ADMIN &&
      requestingUserRole !== UserRole.MANAGEMENT
    ) {
      throw new Error(
        'ይፋዊ የትምህርት ማስረጃ (Official Transcript) የመመልከት ፈቃድ የለዎትም። ሰነዱ በአስተዳዳሪዎች ብቻ የሚዘጋጅ እና የሚተዳደር ነው።'
      );
    }

    const rawTranscript = await this.computeRawTranscript(studentId);
    const logs = await this.getPublicationLogs(studentId);
    const state = this.parseTranscriptState(logs);

    // Case A: A published version exists -> Always return latest published version as official document!
    if (state.latestPublishLog && state.latestPublishDetails) {
      const details = state.latestPublishDetails;
      const snapshot = details.snapshot;

      const effectiveData = (snapshot && snapshot.academicTerms) ? {
        student: snapshot.student || rawTranscript.student,
        summary: snapshot.summary || rawTranscript.summary,
        historyTerms: snapshot.historyTerms || rawTranscript.historyTerms,
        academicTerms: snapshot.academicTerms || rawTranscript.academicTerms,
        cumulativeGpa: snapshot.cumulativeGpa ?? rawTranscript.cumulativeGpa,
        totalCreditsEarned: snapshot.totalCreditsEarned ?? rawTranscript.totalCreditsEarned,
      } : rawTranscript;

      return {
        ...effectiveData,
        publication: {
          status: 'PUBLISHED',
          versionNumber: state.latestVersionNumber,
          isDraft: false,
          isHistorical: false,
          preparedAt: details.preparedAt || state.latestPrepareLog?.createdAt?.toISOString() || null,
          preparedById: details.preparedById || state.latestPrepareLog?.userId || null,
          preparedByName: details.preparedByName || null,
          publishedAt: details.publishedAt || state.latestPublishLog.createdAt.toISOString(),
          publishedById: state.latestPublishLog.userId,
          publishedByName: state.latestPublishLog.user
            ? `${state.latestPublishLog.user.firstName} ${state.latestPublishLog.user.lastName}`
            : details.publishedByName || 'አስተዳዳሪ',
          notes: details.notes || null,
        },
        activeDraft: state.activeDraft,
        availableVersions: state.availableVersions,
        publicationHistory: state.publicationHistory,
      };
    }

    // Case B: No published version yet, but an active working draft exists (Draft for Version 1)
    if (state.hasActiveDraft && state.activeDraft) {
      const draft = state.activeDraft;
      const snapshot = draft.snapshot;
      const effectiveData = (snapshot && snapshot.academicTerms) ? {
        student: snapshot.student || rawTranscript.student,
        summary: snapshot.summary || rawTranscript.summary,
        historyTerms: snapshot.historyTerms || rawTranscript.historyTerms,
        academicTerms: snapshot.academicTerms || rawTranscript.academicTerms,
        cumulativeGpa: snapshot.cumulativeGpa ?? rawTranscript.cumulativeGpa,
        totalCreditsEarned: snapshot.totalCreditsEarned ?? rawTranscript.totalCreditsEarned,
      } : rawTranscript;

      return {
        ...effectiveData,
        publication: {
          status: 'PREPARED',
          versionNumber: null,
          targetVersionNumber: 1,
          isDraft: true,
          isHistorical: false,
          preparedAt: draft.preparedAt,
          preparedById: draft.preparedById,
          preparedByName: draft.preparedByName,
          publishedAt: null,
          publishedById: null,
          publishedByName: null,
          notes: draft.notes || null,
        },
        activeDraft: state.activeDraft,
        availableVersions: state.availableVersions,
        publicationHistory: state.publicationHistory,
      };
    }

    // Case C: No published version and no active draft (Not Prepared)
    return {
      ...rawTranscript,
      publication: {
        status: 'NOT_PREPARED',
        versionNumber: null,
        isDraft: false,
        isHistorical: false,
        preparedAt: null,
        preparedById: null,
        preparedByName: null,
        publishedAt: null,
        publishedById: null,
        publishedByName: null,
        notes: null,
      },
      activeDraft: null,
      availableVersions: [],
      publicationHistory: state.publicationHistory,
    };
  }

  /**
   * Retrieves the current active working draft separately.
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT.
   */
  async getTranscriptDraft(
    studentId: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<OfficialTranscriptDocument> {
    if (
      requestingUserRole !== UserRole.ADMIN &&
      requestingUserRole !== UserRole.SUPER_ADMIN &&
      requestingUserRole !== UserRole.MANAGEMENT
    ) {
      throw new Error('ረቂቅ የትምህርት ማስረጃ የመመልከት ፈቃድ የለዎትም።');
    }

    const logs = await this.getPublicationLogs(studentId);
    const state = this.parseTranscriptState(logs);

    if (!state.hasActiveDraft || !state.activeDraft) {
      throw new Error('ምንም ንቁ ረቂቅ የትምህርት ማስረጃ አልተገኘም።');
    }

    const rawTranscript = await this.computeRawTranscript(studentId);
    const draft = state.activeDraft;
    const snapshot = draft.snapshot;

    const effectiveData = (snapshot && snapshot.academicTerms) ? {
      student: snapshot.student || rawTranscript.student,
      summary: snapshot.summary || rawTranscript.summary,
      historyTerms: snapshot.historyTerms || rawTranscript.historyTerms,
      academicTerms: snapshot.academicTerms || rawTranscript.academicTerms,
      cumulativeGpa: snapshot.cumulativeGpa ?? rawTranscript.cumulativeGpa,
      totalCreditsEarned: snapshot.totalCreditsEarned ?? rawTranscript.totalCreditsEarned,
    } : rawTranscript;

    return {
      ...effectiveData,
      publication: {
        status: 'PREPARED',
        versionNumber: null,
        targetVersionNumber: draft.targetVersionNumber,
        isDraft: true,
        isHistorical: false,
        preparedAt: draft.preparedAt,
        preparedById: draft.preparedById,
        preparedByName: draft.preparedByName,
        publishedAt: null,
        publishedById: null,
        publishedByName: null,
        notes: draft.notes || null,
      },
      activeDraft: state.activeDraft,
      availableVersions: state.availableVersions,
      publicationHistory: state.publicationHistory,
    };
  }

  /**
   * Retrieves a specific historical published transcript version (e.g. Version 1, Version 2).
   * Displays the original saved sealed snapshot, NOT newly calculated grades from the current DB.
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT.
   */
  async getTranscriptVersion(
    studentId: string,
    versionNumber: number,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<OfficialTranscriptDocument> {
    if (
      requestingUserRole !== UserRole.ADMIN &&
      requestingUserRole !== UserRole.SUPER_ADMIN &&
      requestingUserRole !== UserRole.MANAGEMENT
    ) {
      throw new Error('የቀደመ ይፋዊ የትምህርት ማስረጃ የመመልከት ፈቃድ የለዎትም።');
    }

    if (isNaN(versionNumber) || versionNumber <= 0) {
      throw new Error('ልክ ያልሆነ የቅጽ ቁጥር (Invalid version number)።');
    }

    const logs = await this.getPublicationLogs(studentId);
    const state = this.parseTranscriptState(logs);

    // Find the published log matching the requested version number
    const targetLog = state.publishedLogsAsc.find((l, idx) => {
      const d = (l.details as any) || {};
      const num = typeof d.versionNumber === 'number' ? d.versionNumber : idx + 1;
      return num === versionNumber;
    });

    if (!targetLog) {
      throw new Error(`የተጠየቀው ይፋዊ የትምህርት ማስረጃ ቅጽ ${versionNumber} አልተገኘም።`);
    }

    const details = (targetLog.details as any) || {};
    const snapshot = details.snapshot;

    if (!snapshot || !snapshot.academicTerms) {
      throw new Error(`ለቅጽ ${versionNumber} የተመዘገበ ይፋዊ ማህደር አልተገኘም።`);
    }

    return {
      student: snapshot.student,
      summary: snapshot.summary,
      historyTerms: snapshot.historyTerms,
      academicTerms: snapshot.academicTerms,
      cumulativeGpa: snapshot.cumulativeGpa,
      totalCreditsEarned: snapshot.totalCreditsEarned,
      publication: {
        status: 'PUBLISHED',
        versionNumber,
        isDraft: false,
        isHistorical: versionNumber < (state.latestVersionNumber || 0),
        preparedAt: details.preparedAt || null,
        preparedById: details.preparedById || null,
        preparedByName: details.preparedByName || null,
        publishedAt: details.publishedAt || targetLog.createdAt.toISOString(),
        publishedById: targetLog.userId,
        publishedByName: targetLog.user
          ? `${targetLog.user.firstName} ${targetLog.user.lastName}`
          : details.publishedByName || 'አስተዳዳሪ',
        notes: details.notes || null,
      },
      activeDraft: state.activeDraft,
      availableVersions: state.availableVersions,
      publicationHistory: state.publicationHistory,
    };
  }

  /**
   * Acquire an exclusive per-student write lock using PostgreSQL SELECT ... FOR UPDATE.
   * This serializes prepare, publish, and discard operations per student across concurrent transactions.
   */
  private async acquireStudentLock(tx: any, studentId: string): Promise<void> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "students" WHERE id = ${studentId} FOR UPDATE
    `;
    if (!lockedRows || lockedRows.length === 0) {
      const err: any = new Error('የተማሪው መረጃ አልተገኘም።');
      err.statusCode = 404;
      throw err;
    }
  }

  /**
   * Prepares a new working draft.
   * Access: ADMIN, SUPER_ADMIN.
   *
   * CONCURRENCY & INTEGRITY:
   * 1. Acquires row-level write lock on the student record.
   * 2. Checks inside the transaction whether an active draft already exists.
   * 3. If an active draft exists, rejects with HTTP 409 Conflict to prevent overwriting.
   * 4. Preparing a draft NEVER replaces, modifies, or hides any previously published version.
   */
  async prepareOfficialTranscript(
    studentId: string,
    adminUserId: string,
    notes?: string
  ): Promise<OfficialTranscriptDocument> {
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    if (
      !adminUser ||
      (adminUser.role !== UserRole.ADMIN && adminUser.role !== UserRole.SUPER_ADMIN)
    ) {
      const err: any = new Error('ይፋዊ የትምህርት ማስረጃ የማዘጋጀት ፈቃድ የለዎትም።');
      err.statusCode = 403;
      throw err;
    }

    const adminName = `${adminUser.firstName} ${adminUser.lastName}`;
    const preparedAt = new Date().toISOString();

    // Recalculate fresh academic data from current published grades in DB
    const rawTranscript = await this.computeRawTranscript(studentId);

    await prisma.$transaction(async (tx) => {
      // 1. Reliable per-student row-level write lock
      await this.acquireStudentLock(tx, studentId);

      // 2. Fetch full relevant audit history within the transaction
      const logs = await tx.auditLog.findMany({
        where: {
          entityName: 'OfficialTranscript',
          entityId: studentId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const state = this.parseTranscriptState(logs);

      // 3. Prevent overwriting active draft: reject if active draft already exists
      if (state.hasActiveDraft && state.activeDraft) {
        const existingVersionTarget = state.activeDraft.targetVersionNumber;
        const err: any = new Error(
          `ለዚህ ተማሪ አስቀድሞ የተዘጋጀ ንቁ ረቂቅ (ቅጽ ${existingVersionTarget}) አለ። እባክዎ አዲሱን ረቂቅ ከማዘጋጀትዎ በፊት ነባሩን ረቂቅ ያጽድቁ ወይም ይሰርዙ።`
        );
        err.statusCode = 409;
        throw err;
      }

      const targetVersionNumber = (state.latestVersionNumber || 0) + 1;

      // 4. Create PREPARE audit log inside transaction
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PREPARE_OFFICIAL_TRANSCRIPT',
          entityName: 'OfficialTranscript',
          entityId: studentId,
          details: {
            status: 'PREPARED',
            targetVersionNumber,
            preparedAt,
            preparedById: adminUserId,
            preparedByName: adminName,
            notes: notes || `ይፋዊ የትምህርት ማስረጃ ቅጽ ${targetVersionNumber} ረቂቅ በአስተዳዳሪው ተዘጋጅቶ ለግምገማ ቀርቧል።`,
            snapshot: {
              student: rawTranscript.student,
              summary: rawTranscript.summary,
              historyTerms: rawTranscript.historyTerms,
              academicTerms: rawTranscript.academicTerms,
              termsCount: rawTranscript.historyTerms.length,
              cumulativeGpa: rawTranscript.cumulativeGpa,
              totalCreditsEarned: rawTranscript.totalCreditsEarned,
            },
          } as any,
        },
      });
    });

    // Return the newly prepared draft after transaction commits
    return this.getTranscriptDraft(studentId, adminUserId, adminUser.role);
  }

  /**
   * Publishes an official transcript version.
   * Access: ADMIN, SUPER_ADMIN.
   *
   * CONCURRENCY & INTEGRITY:
   * 1. Acquires exclusive row-level write lock on the student record (FOR UPDATE).
   * 2. Confirms inside the transaction that an active draft currently exists.
   * 3. Rejects publication with HTTP 409 Conflict if no active draft exists or if draft was discarded.
   * 4. Strictly seals the exact active draft snapshot; never recalculates raw data on publish.
   * 5. Atomically calculates and assigns the next sequential version number per student.
   */
  async publishOfficialTranscript(
    studentId: string,
    adminUserId: string,
    notes?: string
  ): Promise<OfficialTranscriptDocument> {
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    if (
      !adminUser ||
      (adminUser.role !== UserRole.ADMIN && adminUser.role !== UserRole.SUPER_ADMIN)
    ) {
      const err: any = new Error('ይፋዊ የትምህርት ማስረጃ የማጽደቅ እና የማተም ፈቃድ የለዎትም።');
      err.statusCode = 403;
      throw err;
    }

    const adminName = `${adminUser.firstName} ${adminUser.lastName}`;
    const publishedAt = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      // 1. Reliable per-student row-level write lock
      await this.acquireStudentLock(tx, studentId);

      // 2. Fetch full relevant audit history within the transaction
      const logs = await tx.auditLog.findMany({
        where: {
          entityName: 'OfficialTranscript',
          entityId: studentId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const state = this.parseTranscriptState(logs);

      // 3. Confirm active draft exists (reject if no active draft or if draft was discarded)
      if (!state.hasActiveDraft || !state.activeDraft) {
        const err: any = new Error(
          'የሚታተም ንቁ ረቂቅ የትምህርት ማስረጃ የለም። እባክዎ ሰነዱን ከማተምዎ በፊት አስቀድመው ረቂቅ ያዘጋጁ።'
        );
        err.statusCode = 409;
        throw err;
      }

      // 4. Strictly publish the active draft snapshot (never recalculate or use discarded snapshot)
      const snapshotData = state.activeDraft.snapshot;
      if (!snapshotData || !snapshotData.academicTerms) {
        const err: any = new Error('የረቂቅ ሰነዱ መረጃ የተሟላ አይደለም።');
        err.statusCode = 400;
        throw err;
      }

      // 5. Calculate sequential version number after acquiring lock
      const nextVersionNumber = state.publishedLogsAsc.length + 1;

      // 6. Record immutable publication audit log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PUBLISH_OFFICIAL_TRANSCRIPT',
          entityName: 'OfficialTranscript',
          entityId: studentId,
          details: {
            status: 'PUBLISHED',
            versionNumber: nextVersionNumber,
            publishedAt,
            publishedById: adminUserId,
            publishedByName: adminName,
            notes: notes || `ይፋዊ የትምህርት ማስረጃ ቅጽ ${nextVersionNumber} በይፋ ጸድቆ ታትሟል።`,
            snapshot: snapshotData,
          } as any,
        },
      });
    });

    return this.getOfficialTranscript(studentId, adminUserId, adminUser.role);
  }

  /**
   * Safe Draft Discard / Cancellation
   * Access: ADMIN, SUPER_ADMIN.
   *
   * CONCURRENCY & INTEGRITY:
   * 1. Acquires reliable per-student transaction lock (FOR UPDATE).
   * 2. Confirms active draft exists to discard.
   * 3. Discarding a draft does NOT modify or delete any published version.
   * 4. Logs `DISCARD_OFFICIAL_TRANSCRIPT_DRAFT` and resets active draft state.
   */
  async discardTranscriptDraft(
    studentId: string,
    adminUserId: string,
    reason?: string
  ): Promise<OfficialTranscriptDocument> {
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    if (
      !adminUser ||
      (adminUser.role !== UserRole.ADMIN && adminUser.role !== UserRole.SUPER_ADMIN)
    ) {
      const err: any = new Error('ረቂቅ የትምህርት ማስረጃ የመሰረዝ ፈቃድ የለዎትም።');
      err.statusCode = 403;
      throw err;
    }

    const adminName = `${adminUser.firstName} ${adminUser.lastName}`;
    const discardedAt = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      // 1. Reliable per-student row-level write lock
      await this.acquireStudentLock(tx, studentId);

      // 2. Fetch full relevant audit history within the transaction
      const logs = await tx.auditLog.findMany({
        where: {
          entityName: 'OfficialTranscript',
          entityId: studentId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const state = this.parseTranscriptState(logs);

      // 3. Confirm active draft exists to discard
      if (!state.hasActiveDraft || !state.activeDraft) {
        const err: any = new Error('የሚሰረዝ ንቁ ረቂቅ የትምህርት ማስረጃ የለም።');
        err.statusCode = 400;
        throw err;
      }

      // 4. Create discard audit log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'DISCARD_OFFICIAL_TRANSCRIPT_DRAFT',
          entityName: 'OfficialTranscript',
          entityId: studentId,
          details: {
            status: 'DISCARDED',
            discardedAt,
            discardedById: adminUserId,
            discardedByName: adminName,
            reason: reason || 'ረቂቅ የትምህርት ማስረጃው በአስተዳዳሪው ተሰርዟል።',
          } as any,
        },
      });
    });

    return this.getOfficialTranscript(studentId, adminUserId, adminUser.role);
  }

  /**
   * Retrieves full publication and audit history
   * Access: ADMIN, SUPER_ADMIN, MANAGEMENT
   */
  async getPublicationHistory(studentId: string, requestingUserRole: string) {
    if (
      requestingUserRole !== UserRole.ADMIN &&
      requestingUserRole !== UserRole.SUPER_ADMIN &&
      requestingUserRole !== UserRole.MANAGEMENT
    ) {
      throw new Error('የይፋዊ ማስረጃ ታሪክን የመመልከት ፈቃድ የለዎትም።');
    }

    const logs = await this.getPublicationLogs(studentId);
    const state = this.parseTranscriptState(logs);
    return state.publicationHistory;
  }
}

export const transcriptService = new TranscriptService();
export default transcriptService;
