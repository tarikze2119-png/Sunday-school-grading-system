export type AnnouncementTargetAudience =
  | 'ALL_USERS'
  | 'ALL_STUDENTS'
  | 'SPECIFIC_BATCH'
  | 'INDIVIDUAL_STUDENT'
  | 'ALL_TEACHERS'
  | 'INDIVIDUAL_TEACHER';

export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT';

export type AnnouncementCategory = 'GENERAL' | 'EVENT' | 'ACADEMIC';

export type AnnouncementStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'EXPIRED'
  | 'ARCHIVED';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetAudience: AnnouncementTargetAudience;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  publishAt: string;
  eventDate?: string | null;
  expiresAt: string | null;
  isArchived: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  batch?: {
    id: string;
    name: string;
    stageLevel: string;
    academicYear?: {
      name: string;
    };
  } | null;
  student?: {
    id: string;
    admissionNumber: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  teacher?: {
    id: string;
    teacherCode: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  stats?: {
    totalRecipients: number;
    readCount: number;
    unreadCount: number;
    readPercentage: number;
  };
}

export interface RecipientAnnouncementItem {
  recipientRecordId: string;
  announcementId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  targetAudience: AnnouncementTargetAudience;
  publishAt: string;
  eventDate?: string | null;
  expiresAt: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  author: string;
}

export interface DetailedRecipientStats {
  announcementId: string;
  title: string;
  summary: {
    totalRecipients: number;
    readCount: number;
    unreadCount: number;
    readPercentage: number;
  };
  recipients: Array<{
    recipientId: string;
    userId: string;
    fullName: string;
    role: string;
    identifier: string;
    batchName: string | null;
    isRead: boolean;
    readAt: string | null;
  }>;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  targetAudience: AnnouncementTargetAudience;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  batchId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  publishAt?: string | null;
  eventDate?: string | null;
  expiresAt?: string | null;
  isManualExpiresAt?: boolean;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  content?: string;
  targetAudience?: AnnouncementTargetAudience;
  category?: AnnouncementCategory;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  batchId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  publishAt?: string | null;
  eventDate?: string | null;
  expiresAt?: string | null;
  isManualExpiresAt?: boolean;
}
