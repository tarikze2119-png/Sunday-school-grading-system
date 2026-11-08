import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Prioritize .env.local (root or server dir) for Neon production credentials
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

// Direct unpooled connection is preferred for one-off CLI bootstrap operations
const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const prisma = new PrismaClient(
  dbUrl
    ? {
        datasources: {
          db: { url: dbUrl },
        },
      }
    : undefined
);

async function bootstrap() {
  console.log('================================================================');
  console.log('🛡️  Production Super Admin Bootstrap (የዋና አስተዳዳሪ አካውንት ማመንጫ)');
  console.log('================================================================');

  if (dbUrl) {
    try {
      const parsedUrl = new URL(dbUrl);
      console.log(`📡 Database Host:   ${parsedUrl.host} (${parsedUrl.pathname.replace('/', '')})`);
      console.log(`🔌 Connection Mode: ${process.env.DATABASE_URL_UNPOOLED ? 'Direct / Unpooled (DATABASE_URL_UNPOOLED)' : 'Default (DATABASE_URL)'}`);
    } catch {
      console.log('📡 Database:        Connected via configured connection string');
    }
  }

  const username = process.env.SUPERADMIN_USERNAME?.trim();
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const firstName = process.env.SUPERADMIN_FIRST_NAME?.trim() || 'ዋና';
  const lastName = process.env.SUPERADMIN_LAST_NAME?.trim() || 'አስተዳዳሪ';
  const phone = process.env.SUPERADMIN_PHONE?.trim() || null;

  // 1. Validate required environment variables
  if (!username) {
    console.error('❌ [Security Error] SUPERADMIN_USERNAME environment variable is required.');
    process.exit(1);
  }

  if (!email || !email.includes('@')) {
    console.error('❌ [Security Error] Valid SUPERADMIN_EMAIL environment variable is required.');
    process.exit(1);
  }

  if (!password) {
    console.error('❌ [Security Error] SUPERADMIN_PASSWORD environment variable is required.');
    console.error('   Please provide a strong password via the SUPERADMIN_PASSWORD environment variable.');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ [Security Error] SUPERADMIN_PASSWORD must be at least 12 characters long for production security.');
    process.exit(1);
  }

  // 2. Check if ANY Super Admin already exists (Prevent duplicate/multiple Super Admins)
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
    select: { id: true, username: true, email: true, createdAt: true },
  });

  if (existingSuperAdmin) {
    console.log(`ℹ️  A Super Admin account already exists in this database.`);
    console.log(`   Username: ${existingSuperAdmin.username}`);
    console.log(`   Email:    ${existingSuperAdmin.email || 'N/A'}`);
    console.log(`   Created:  ${existingSuperAdmin.createdAt.toISOString()}`);
    console.log('   No changes were made. Existing credentials were NOT modified.');
    console.log('================================================================');
    return;
  }

  // 3. Check if username or email is already taken by another account
  const conflictingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
    select: { id: true, username: true, email: true, role: true },
  });

  if (conflictingUser) {
    console.error(`❌ [Conflict Error] Username '${username}' or email '${email}' is already in use by role: ${conflictingUser.role}.`);
    process.exit(1);
  }

  // 4. Hash password with bcrypt (12 rounds)
  const passwordHash = await bcrypt.hash(password, 12);

  // 5. Create the Super Admin user
  const newSuperAdmin = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      firstName,
      lastName,
      phone,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  // 6. Record Audit Log entry
  try {
    await prisma.auditLog.create({
      data: {
        userId: newSuperAdmin.id,
        action: 'BOOTSTRAP_SUPERADMIN_ACCOUNT',
        entityName: 'User',
        entityId: newSuperAdmin.id,
        details: {
          username: newSuperAdmin.username,
          email: newSuperAdmin.email,
          role: newSuperAdmin.role,
          bootstrappedAt: new Date().toISOString(),
          system: 'Neon Production Initializer',
        },
      },
    });
  } catch (auditErr) {
    console.warn('⚠️  Could not write audit log entry:', auditErr);
  }

  console.log('✅ Super Admin account created successfully!');
  console.log(`   ID:        ${newSuperAdmin.id}`);
  console.log(`   Username:  ${newSuperAdmin.username}`);
  console.log(`   Email:     ${newSuperAdmin.email}`);
  console.log(`   Role:      ${newSuperAdmin.role}`);
  console.log(`   Full Name: ${newSuperAdmin.firstName} ${newSuperAdmin.lastName}`);
  console.log(`   Created:   ${newSuperAdmin.createdAt.toISOString()}`);
  console.log('----------------------------------------------------------------');
  console.log('🔒 Security Notice: Passwords are encrypted with bcrypt (12 salt rounds).');
  console.log('   The account can now sign in at /login through the Amharic UI.');
  console.log('================================================================');
}

bootstrap()
  .catch((e) => {
    console.error('❌ Bootstrap failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
