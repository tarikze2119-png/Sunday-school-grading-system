import prisma from '../config/prisma.client.js';
import { 
  AnnouncementTargetAudience, 
  AnnouncementPriority, 
  AnnouncementStatus, 
  UserRole,
  NotificationType 
} from '@prisma/client';
import { logAuditEvent } from '../utils/auditLogger.js';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  targetAudience: AnnouncementTargetAudience;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  batchId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  publishAt?: Date | string | null;
  expiresAt?: Date | string | null;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  targetAudience?: AnnouncementTargetAudience;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  batchId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  publishAt?: Date | string | null;
  expiresAt?: Date | string | null;
}

export interface AnnouncementFilterOptions {
  status?: AnnouncementStatus | 'ALL';
  targetAudience?: AnnouncementTargetAudience | 'ALL';
  priority?: AnnouncementPriority | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}

export class AnnouncementService {
  /**
   * Resolve target user IDs based on announcement audience specification
   */
  async resolveRecipientUserIds(
    targetAudience: AnnouncementTargetAudience,
    options: { batchId?: string | null; studentId?: string | null; teacherId?: string | null }
  ): Promise<string[]> {
    const userIds = new Set<string>();

    switch (targetAudience) {
      case AnnouncementTargetAudience.ALL_USERS: {
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        users.forEach((u) => userIds.add(u.id));
        break;
      }

      case AnnouncementTargetAudience.ALL_STUDENTS: {
        const students = await prisma.user.findMany({
          where: { role: UserRole.STUDENT, isActive: true },
          select: { id: true },
        });
        students.forEach((u) => userIds.add(u.id));
        break;
      }

      case AnnouncementTargetAudience.SPECIFIC_BATCH: {
        if (!options.batchId) {
          throw new Error('እባክዎ የተማሪዎች ምድብ ይምረጡ።');
        }

        // Active students registered in this batch
        const studentsInBatch = await prisma.student.findMany({
          where: {
            batchId: options.batchId,
            user: { isActive: true },
          },
          select: { userId: true },
        });
        studentsInBatch.forEach((s) => userIds.add(s.userId));

        // Also check active student registrations for this batch
        const activeRegistrations = await prisma.studentRegistration.findMany({
          where: {
            batchId: options.batchId,
            status: 'ACTIVE',
            student: { user: { isActive: true } },
          },
          select: { student: { select: { userId: true } } },
        });
        activeRegistrations.forEach((r) => userIds.add(r.student.userId));
        break;
      }

      case AnnouncementTargetAudience.INDIVIDUAL_STUDENT: {
        if (!options.studentId) {
          throw new Error('እባክዎ ተማሪ ይምረጡ።');
        }
        const student = await prisma.student.findUnique({
          where: { id: options.studentId },
          select: { userId: true, user: { select: { isActive: true } } },
        });
        if (!student || !student.user.isActive) {
          throw new Error('የተመረጠው ተማሪ አልተገኘም ወይም ንቁ አይደለም።');
        }
        userIds.add(student.userId);
        break;
      }

      case AnnouncementTargetAudience.ALL_TEACHERS: {
        const teachers = await prisma.user.findMany({
          where: { role: UserRole.TEACHER, isActive: true },
          select: { id: true },
        });
        teachers.forEach((t) => userIds.add(t.id));
        break;
      }

      case AnnouncementTargetAudience.INDIVIDUAL_TEACHER: {
        if (!options.teacherId) {
          throw new Error('እባክዎ መምህር ይምረጡ።');
        }
        const teacher = await prisma.teacher.findUnique({
          where: { id: options.teacherId },
          select: { userId: true, user: { select: { isActive: true } } },
        });
        if (!teacher || !teacher.user.isActive) {
          throw new Error('የተመረጠው መምህር አልተገኘም ወይም ንቁ አይደለም።');
        }
        userIds.add(teacher.userId);
        break;
      }
    }

    return Array.from(userIds);
  }

  /**
   * Helper to synchronize in-app notifications and scheduled status
   */
  async autoSyncAnnouncementStatuses() {
    const now = new Date();

    // 1. Promote SCHEDULED -> PUBLISHED if publishAt has arrived
    const scheduledToPublish = await prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.SCHEDULED,
        publishAt: { lte: now },
        isArchived: false,
      },
    });

    let publishedCount = 0;
    for (const ann of scheduledToPublish) {
      await this.publishAnnouncement(ann.id, ann.createdById);
      publishedCount++;
    }

    // 2. Mark PUBLISHED -> EXPIRED if expiresAt has passed
    const expiredResult = await prisma.announcement.updateMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        expiresAt: { lt: now },
        isArchived: false,
      },
      data: {
        status: AnnouncementStatus.EXPIRED,
      },
    });

    return {
      publishedCount,
      expiredCount: expiredResult.count,
      syncedAt: now.toISOString(),
    };
  }

  /**
   * 1. Create a new Announcement
   */
  async createAnnouncement(input: CreateAnnouncementInput, creatorUserId: string) {
    if (!input.title?.trim()) {
      throw new Error('የማስታወቂያ ርዕስ መሞላት አለበት።');
    }
    if (!input.content?.trim()) {
      throw new Error('የማስታወቂያ ዝርዝር መልእክት መሞላት አለበት።');
    }

    const now = new Date();
    const publishAtDate = input.publishAt ? new Date(input.publishAt) : now;
    const expiresAtDate = input.expiresAt ? new Date(input.expiresAt) : null;

    if (expiresAtDate && expiresAtDate <= publishAtDate) {
      throw new Error('የማስታወቂያው ማብቂያ ቀን ከሚለጠፍበት ቀን በኋላ መሆን አለበት።');
    }

    let initialStatus = input.status || AnnouncementStatus.DRAFT;
    if (initialStatus === AnnouncementStatus.PUBLISHED && publishAtDate > now) {
      initialStatus = AnnouncementStatus.SCHEDULED;
    }

    // Resolve recipients upfront to validate audience target parameters
    const recipientUserIds = await this.resolveRecipientUserIds(input.targetAudience, {
      batchId: input.batchId,
      studentId: input.studentId,
      teacherId: input.teacherId,
    });

    const announcement = await prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          title: input.title.trim(),
          content: input.content.trim(),
          targetAudience: input.targetAudience,
          priority: input.priority || AnnouncementPriority.NORMAL,
          status: initialStatus,
          batchId: input.targetAudience === AnnouncementTargetAudience.SPECIFIC_BATCH ? input.batchId : null,
          studentId: input.targetAudience === AnnouncementTargetAudience.INDIVIDUAL_STUDENT ? input.studentId : null,
          teacherId: input.targetAudience === AnnouncementTargetAudience.INDIVIDUAL_TEACHER ? input.teacherId : null,
          publishAt: publishAtDate,
          expiresAt: expiresAtDate,
          createdById: creatorUserId,
        },
      });

      // If published immediately, populate recipients and notifications
      if (initialStatus === AnnouncementStatus.PUBLISHED) {
        if (recipientUserIds.length > 0) {
          await tx.announcementRecipient.createMany({
            data: recipientUserIds.map((uid) => ({
              announcementId: created.id,
              userId: uid,
            })),
            skipDuplicates: true,
          });

          // Generate corresponding in-app notifications
          await tx.notification.createMany({
            data: recipientUserIds.map((uid) => ({
              userId: uid,
              type: NotificationType.ANNOUNCEMENT,
              title: created.title,
              message: created.content.length > 120 ? `${created.content.slice(0, 117)}...` : created.content,
              linkUrl: `/dashboard?announcementId=${created.id}`,
            })),
          });
        }
      }

      return created;
    });

    await logAuditEvent({
      userId: creatorUserId,
      action: 'CREATE_ANNOUNCEMENT',
      entityName: 'Announcement',
      entityId: announcement.id,
      details: {
        title: announcement.title,
        targetAudience: announcement.targetAudience,
        status: announcement.status,
        recipientCount: recipientUserIds.length,
      },
    });

    return this.getAnnouncementById(announcement.id);
  }

  /**
   * 2. Publish a draft or scheduled announcement
   */
  async publishAnnouncement(announcementId: string, adminUserId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new Error('ማስታወቂያው አልተገኘም።');
    }

    if (announcement.isArchived) {
      throw new Error('ይህ ማስታወቂያ በማህደር (Archived) ስለተቀመጠ መልሶ ማሳተም አይቻልም።');
    }

    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      // Already published: return without duplicating recipients or notifications
      return this.getAnnouncementById(announcement.id);
    }

    const recipientUserIds = await this.resolveRecipientUserIds(announcement.targetAudience, {
      batchId: announcement.batchId,
      studentId: announcement.studentId,
      teacherId: announcement.teacherId,
    });

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // Atomic guard against concurrent duplicate publication
      const updateResult = await tx.announcement.updateMany({
        where: {
          id: announcementId,
          status: { in: [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED] },
          isArchived: false,
        },
        data: {
          status: AnnouncementStatus.PUBLISHED,
          publishAt: announcement.publishAt > now ? now : announcement.publishAt,
        },
      });

      if (updateResult.count === 0) {
        // Concurrently published by another process
        return tx.announcement.findUnique({ where: { id: announcementId } });
      }

      if (recipientUserIds.length > 0) {
        await tx.announcementRecipient.createMany({
          data: recipientUserIds.map((uid) => ({
            announcementId: announcement.id,
            userId: uid,
          })),
          skipDuplicates: true,
        });

        await tx.notification.createMany({
          data: recipientUserIds.map((uid) => ({
            userId: uid,
            type: NotificationType.ANNOUNCEMENT,
            title: announcement.title,
            message: announcement.content.length > 120 ? `${announcement.content.slice(0, 117)}...` : announcement.content,
            linkUrl: `/dashboard?announcementId=${announcement.id}`,
          })),
        });
      }

      return tx.announcement.findUnique({ where: { id: announcementId } });
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'PUBLISH_ANNOUNCEMENT',
      entityName: 'Announcement',
      entityId: announcement.id,
      details: {
        title: updated?.title || announcement.title,
        status: updated?.status || AnnouncementStatus.PUBLISHED,
        recipientCount: recipientUserIds.length,
      },
    });

    return this.getAnnouncementById(announcement.id);
  }

  /**
   * 3. Update an existing announcement
   */
  async updateAnnouncement(announcementId: string, input: UpdateAnnouncementInput, adminUserId: string) {
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { recipients: true },
    });

    if (!existing) {
      throw new Error('ማስታወቂያው አልተገኘም።');
    }

    if (existing.isArchived) {
      throw new Error('በማህደር የተቀመጠን ማስታወቂያ ማስተካከል አይቻልም።');
    }

    const now = new Date();
    const newPublishAt = input.publishAt !== undefined ? (input.publishAt ? new Date(input.publishAt) : now) : existing.publishAt;
    const newExpiresAt = input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : existing.expiresAt;

    if (newExpiresAt && newExpiresAt <= newPublishAt) {
      throw new Error('የማስታወቂያው ማብቂያ ቀን ከሚለጠፍበት ቀን በኋላ መሆን አለበት።');
    }

    const targetAudience = input.targetAudience || existing.targetAudience;
    const batchId = input.batchId !== undefined ? input.batchId : existing.batchId;
    const studentId = input.studentId !== undefined ? input.studentId : existing.studentId;
    const teacherId = input.teacherId !== undefined ? input.teacherId : existing.teacherId;

    const audienceChanged =
      targetAudience !== existing.targetAudience ||
      batchId !== existing.batchId ||
      studentId !== existing.studentId ||
      teacherId !== existing.teacherId;

    let targetStatus = input.status || existing.status;
    if (targetStatus === AnnouncementStatus.PUBLISHED && newPublishAt > now) {
      targetStatus = AnnouncementStatus.SCHEDULED;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ann = await tx.announcement.update({
        where: { id: announcementId },
        data: {
          title: input.title !== undefined ? input.title.trim() : existing.title,
          content: input.content !== undefined ? input.content.trim() : existing.content,
          targetAudience,
          priority: input.priority || existing.priority,
          status: targetStatus,
          batchId: targetAudience === AnnouncementTargetAudience.SPECIFIC_BATCH ? batchId : null,
          studentId: targetAudience === AnnouncementTargetAudience.INDIVIDUAL_STUDENT ? studentId : null,
          teacherId: targetAudience === AnnouncementTargetAudience.INDIVIDUAL_TEACHER ? teacherId : null,
          publishAt: newPublishAt,
          expiresAt: newExpiresAt,
        },
      });

      // Synchronize recipients if published and audience changed
      if (targetStatus === AnnouncementStatus.PUBLISHED && audienceChanged) {
        const newRecipientUserIds = await this.resolveRecipientUserIds(targetAudience, {
          batchId,
          studentId,
          teacherId,
        });

        const newSet = new Set(newRecipientUserIds);
        const existingMap = new Map(existing.recipients.map((r) => [r.userId, r]));

        // 1. Delete recipients no longer in target
        const toDeleteIds = existing.recipients
          .filter((r) => !newSet.has(r.userId))
          .map((r) => r.id);

        if (toDeleteIds.length > 0) {
          await tx.announcementRecipient.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        // 2. Add new recipients not yet registered
        const toAddUserIds = newRecipientUserIds.filter((uid) => !existingMap.has(uid));
        if (toAddUserIds.length > 0) {
          await tx.announcementRecipient.createMany({
            data: toAddUserIds.map((uid) => ({
              announcementId: ann.id,
              userId: uid,
            })),
            skipDuplicates: true,
          });

          await tx.notification.createMany({
            data: toAddUserIds.map((uid) => ({
              userId: uid,
              type: NotificationType.ANNOUNCEMENT,
              title: ann.title,
              message: ann.content.length > 120 ? `${ann.content.slice(0, 117)}...` : ann.content,
              linkUrl: `/dashboard?announcementId=${ann.id}`,
            })),
          });
        }
      }

      return ann;
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'UPDATE_ANNOUNCEMENT',
      entityName: 'Announcement',
      entityId: announcementId,
      details: {
        title: updated.title,
        status: updated.status,
        audienceChanged,
      },
    });

    return this.getAnnouncementById(announcementId);
  }

  /**
   * 4. Archive an announcement
   */
  async archiveAnnouncement(announcementId: string, adminUserId: string) {
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      throw new Error('ማስታወቂያው አልተገኘም።');
    }

    const archived = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        status: AnnouncementStatus.ARCHIVED,
        isArchived: true,
      },
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'ARCHIVE_ANNOUNCEMENT',
      entityName: 'Announcement',
      entityId: announcementId,
      details: {
        title: archived.title,
      },
    });

    return this.getAnnouncementById(announcementId);
  }

  /**
   * 5. Get a single announcement by ID with full administrative statistics
   */
  async getAnnouncementById(announcementId: string) {
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        batch: {
          select: { id: true, name: true, stageLevel: true, academicYear: { select: { id: true, name: true } } },
        },
        student: {
          select: {
            id: true,
            admissionNumber: true,
            baptismalName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        teacher: {
          select: {
            id: true,
            teacherCode: true,
            spiritualTitle: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        recipients: {
          select: { id: true, isRead: true, readAt: true, userId: true },
        },
      },
    });

    if (!ann) return null;

    const totalRecipients = ann.recipients.length;
    const readCount = ann.recipients.filter((r) => r.isRead).length;
    const unreadCount = totalRecipients - readCount;
    const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 1000) / 10 : 0;

    return {
      id: ann.id,
      title: ann.title,
      content: ann.content,
      targetAudience: ann.targetAudience,
      priority: ann.priority,
      status: ann.status,
      batchId: ann.batchId,
      batch: ann.batch,
      studentId: ann.studentId,
      student: ann.student,
      teacherId: ann.teacherId,
      teacher: ann.teacher,
      publishAt: ann.publishAt,
      expiresAt: ann.expiresAt,
      isArchived: ann.isArchived,
      createdAt: ann.createdAt,
      updatedAt: ann.updatedAt,
      createdBy: ann.createdBy,
      stats: {
        totalRecipients,
        readCount,
        unreadCount,
        readPercentage,
      },
    };
  }

  /**
   * 6. Administrative Announcement Management Dashboard Listing
   */
  async getAdminAnnouncements(filters: AnnouncementFilterOptions = {}) {
    await this.autoSyncAnnouncementStatuses();

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.targetAudience && filters.targetAudience !== 'ALL') {
      where.targetAudience = filters.targetAudience;
    }

    if (filters.priority && filters.priority !== 'ALL') {
      where.priority = filters.priority;
    }

    if (filters.search?.trim()) {
      where.OR = [
        { title: { contains: filters.search.trim(), mode: 'insensitive' } },
        { content: { contains: filters.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          batch: { select: { id: true, name: true, stageLevel: true, academicYear: { select: { name: true } } } },
          student: { select: { id: true, admissionNumber: true, user: { select: { firstName: true, lastName: true } } } },
          teacher: { select: { id: true, teacherCode: true, user: { select: { firstName: true, lastName: true } } } },
          recipients: { select: { id: true, isRead: true } },
        },
        orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((ann) => {
      const totalRecipients = ann.recipients.length;
      const readCount = ann.recipients.filter((r) => r.isRead).length;
      const unreadCount = totalRecipients - readCount;
      const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 1000) / 10 : 0;

      return {
        id: ann.id,
        title: ann.title,
        content: ann.content,
        targetAudience: ann.targetAudience,
        priority: ann.priority,
        status: ann.status,
        batch: ann.batch,
        student: ann.student,
        teacher: ann.teacher,
        publishAt: ann.publishAt,
        expiresAt: ann.expiresAt,
        isArchived: ann.isArchived,
        createdAt: ann.createdAt,
        createdBy: ann.createdBy,
        stats: {
          totalRecipients,
          readCount,
          unreadCount,
          readPercentage,
        },
      };
    });

    return {
      items: formattedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 7. Detailed Recipient Statistics for an Announcement (Admin Only)
   */
  async getDetailedRecipientStats(announcementId: string) {
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                username: true,
                phone: true,
                studentProfile: { select: { admissionNumber: true, batch: { select: { name: true } } } },
                teacherProfile: { select: { teacherCode: true } },
              },
            },
          },
          orderBy: [{ isRead: 'desc' }, { readAt: 'desc' }],
        },
      },
    });

    if (!ann) {
      throw new Error('ማስታወቂያው አልተገኘም።');
    }

    const totalRecipients = ann.recipients.length;
    const readCount = ann.recipients.filter((r) => r.isRead).length;
    const unreadCount = totalRecipients - readCount;
    const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 1000) / 10 : 0;

    return {
      announcementId: ann.id,
      title: ann.title,
      summary: {
        totalRecipients,
        readCount,
        unreadCount,
        readPercentage,
      },
      recipients: ann.recipients.map((r) => ({
        recipientId: r.id,
        userId: r.user.id,
        fullName: `${r.user.firstName} ${r.user.lastName}`,
        role: r.user.role,
        identifier: r.user.studentProfile?.admissionNumber || r.user.teacherProfile?.teacherCode || r.user.username,
        batchName: r.user.studentProfile?.batch?.name || null,
        isRead: r.isRead,
        readAt: r.readAt,
      })),
    };
  }

  /**
   * 8. Get Announcements for the Authenticated Recipient (Strict Isolation)
   */
  async getAnnouncementsForUser(userId: string) {
    await this.autoSyncAnnouncementStatuses();

    const now = new Date();

    const recipientRecords = await prisma.announcementRecipient.findMany({
      where: {
        userId,
        announcement: {
          status: AnnouncementStatus.PUBLISHED,
          publishAt: { lte: now },
          isArchived: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
      include: {
        announcement: {
          include: {
            createdBy: {
              select: { firstName: true, lastName: true, role: true },
            },
          },
        },
      },
      orderBy: [
        { isRead: 'asc' }, // Unread first
        { announcement: { priority: 'desc' } }, // IMPORTANT first
        { announcement: { publishAt: 'desc' } },
      ],
    });

    return recipientRecords.map((r) => ({
      recipientRecordId: r.id,
      announcementId: r.announcement.id,
      title: r.announcement.title,
      content: r.announcement.content,
      priority: r.announcement.priority,
      targetAudience: r.announcement.targetAudience,
      publishAt: r.announcement.publishAt,
      expiresAt: r.announcement.expiresAt,
      isRead: r.isRead,
      readAt: r.readAt,
      createdAt: r.announcement.createdAt,
      author: `${r.announcement.createdBy.firstName} ${r.announcement.createdBy.lastName}`,
    }));
  }

  /**
   * 9. Get Announcement Details and Mark as Read for User
   */
  async getAnnouncementDetailsAndMarkRead(announcementId: string, userId: string) {
    const recipient = await prisma.announcementRecipient.findUnique({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
      include: {
        announcement: {
          include: {
            createdBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!recipient) {
      throw new Error('ይህንን ማስታወቂያ የመመልከት ፈቃድ የለዎትም።');
    }

    // Automatically record read status
    if (!recipient.isRead) {
      await prisma.announcementRecipient.update({
        where: { id: recipient.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return {
      announcementId: recipient.announcement.id,
      title: recipient.announcement.title,
      content: recipient.announcement.content,
      priority: recipient.announcement.priority,
      publishAt: recipient.announcement.publishAt,
      expiresAt: recipient.announcement.expiresAt,
      author: `${recipient.announcement.createdBy.firstName} ${recipient.announcement.createdBy.lastName}`,
      isRead: true,
    };
  }

  /**
   * 10. Explicitly Mark Announcement as Read
   */
  async markAsRead(announcementId: string, userId: string) {
    const recipient = await prisma.announcementRecipient.findUnique({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
    });

    if (!recipient) {
      throw new Error('የማስታወቂያ ተቀባይ መዝገብ አልተገኘም።');
    }

    if (!recipient.isRead) {
      await prisma.announcementRecipient.update({
        where: { id: recipient.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return { success: true };
  }

  /**
   * 11. Count Unread Announcements for Current User
   */
  async getUnreadCount(userId: string): Promise<number> {
    const now = new Date();

    return prisma.announcementRecipient.count({
      where: {
        userId,
        isRead: false,
        announcement: {
          status: AnnouncementStatus.PUBLISHED,
          publishAt: { lte: now },
          isArchived: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    });
  }
}

export default new AnnouncementService();
