import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.client.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { UserRole } from '@prisma/client';

export class AuthService {
  /**
   * Authenticate user via username, email, or phone
   */
  async login(identifier: string, password: string, ipAddress?: string, userAgent?: string) {
    if (!identifier || !password) {
      const error: any = new Error('እባክዎ የተጠቃሚ ስም/ስልክ እና የይለፍ ቃል ያስገቡ።');
      error.statusCode = 400;
      throw error;
    }

    // Search by username, email, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.trim() },
          { email: identifier.trim().toLowerCase() },
          { phone: identifier.trim() },
        ],
      },
      include: {
        studentProfile: { select: { id: true, admissionNumber: true, batchId: true, academicYearId: true } },
        teacherProfile: { select: { id: true, teacherCode: true } },
        managementProfile: { select: { id: true, positionTitle: true, department: true } },
      },
    });

    if (!user) {
      const error: any = new Error('የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል።');
      error.statusCode = 401;
      throw error;
    }

    // Check account status
    if (!user.isActive) {
      const error: any = new Error('ይህ አካውንት ታግዷል (ተዘግቷል)። እባክዎ ዋና አስተዳዳሪውን ያነጋግሩ።');
      error.statusCode = 403;
      throw error;
    }

    // Verify bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል።');
      error.statusCode = 401;
      throw error;
    }

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentProfile?.id,
      teacherId: user.teacherProfile?.id,
    });

    const refreshToken = signRefreshToken({ userId: user.id });

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record Audit Log
    await logAuditEvent({
      userId: user.id,
      action: 'USER_LOGIN',
      entityName: 'User',
      entityId: user.id,
      details: { role: user.role, username: user.username },
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        grandfatherName: user.grandfatherName,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile,
        managementProfile: user.managementProfile,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Renew Access Token using valid Refresh Token
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      const error: any = new Error('የማደሻ ማስረጃ (Refresh Token) አልተገኘም።');
      error.statusCode = 401;
      throw error;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: { select: { id: true, admissionNumber: true } },
        teacherProfile: { select: { id: true, teacherCode: true } },
      },
    });

    if (!user || !user.isActive) {
      const error: any = new Error('ተጠቃሚው አልተገኘም ወይም አካውንቱ ታግዷል።');
      error.statusCode = 401;
      throw error;
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentProfile?.id,
      teacherId: user.teacherProfile?.id,
    });

    return { accessToken: newAccessToken };
  }

  /**
   * Self-service password change
   */
  async changePassword(userId: string, currentPass: string, newPass: string, ipAddress?: string, userAgent?: string) {
    if (!currentPass || !newPass) {
      const error: any = new Error('እባክዎ ነባሩን እና አዲሱን የይለፍ ቃል ያስገቡ።');
      error.statusCode = 400;
      throw error;
    }

    if (newPass.length < 12) {
      const error: any = new Error('አዲሱ የይለፍ ቃል ቢያንስ 12 ፊደላት ወይም ቁጥሮች መያዝ አለበት።');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error: any = new Error('ተጠቃሚው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('የአሁኑ የይለፍ ቃል ትክክል አይደለም።');
      error.statusCode = 400;
      throw error;
    }

    const newPasswordHash = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await logAuditEvent({
      userId,
      action: 'PASSWORD_CHANGED',
      entityName: 'User',
      entityId: userId,
      details: { changedBy: 'SELF' },
      ipAddress,
      userAgent,
    });

    return { message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል።' };
  }

  /**
   * Administrator Reset Password for another user (Strict RBAC enforcement)
   */
  async adminResetPassword(
    operator: { id: string; role: UserRole; username: string },
    targetUserId: string,
    newPass: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (!newPass || newPass.length < 12) {
      const error: any = new Error('አዲሱ የይለፍ ቃል ቢያንስ 12 ፊደላት መሆን አለበት።');
      error.statusCode = 400;
      throw error;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      const error: any = new Error('የይለፍ ቃሉ የሚቀየርለት ተጠቃሚ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Role Hierarchy Rule Enforcement:
    // 1. SUPER_ADMIN can reset anyone's password
    // 2. ADMIN can only reset TEACHER and STUDENT passwords (CANNOT reset SUPER_ADMIN or MANAGEMENT)
    // 3. Other roles cannot reset passwords
    if (operator.role === UserRole.ADMIN) {
      if (targetUser.role === UserRole.SUPER_ADMIN || targetUser.role === UserRole.MANAGEMENT) {
        const error: any = new Error('አስተዳዳሪ (Admin) የዋና አስተዳዳሪን ወይም የአመራርን የይለፍ ቃል የመቀየር ፈቃድ የለውም።');
        error.statusCode = 403;
        throw error;
      }
      if (targetUser.role === UserRole.ADMIN && operator.id !== targetUser.id) {
        const error: any = new Error('አስተዳዳሪ የሌላ አቻ አስተዳዳሪን የይለፍ ቃል የመቀየር ፈቃድ የለውም።');
        error.statusCode = 403;
        throw error;
      }
    } else if (operator.role !== UserRole.SUPER_ADMIN) {
      const error: any = new Error('ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም።');
      error.statusCode = 403;
      throw error;
    }

    const newHash = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: newHash },
    });

    await logAuditEvent({
      userId: operator.id,
      action: 'ADMIN_PASSWORD_RESET',
      entityName: 'User',
      entityId: targetUserId,
      details: {
        resetBy: operator.username,
        operatorRole: operator.role,
        targetUsername: targetUser.username,
        targetRole: targetUser.role,
      },
      ipAddress,
      userAgent,
    });

    return {
      message: `የተጠቃሚ '${targetUser.username}' የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል።`,
    };
  }
}

export const authService = new AuthService();
export default authService;
