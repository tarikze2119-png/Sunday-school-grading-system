-- CreateEnum
CREATE TYPE "AdminResponsibility" AS ENUM ('ANNOUNCEMENT_ADMIN', 'USER_REGISTRATION_ADMIN', 'COURSE_TEACHER_ADMIN', 'RESULT_MANAGEMENT_ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "adminResponsibilities" "AdminResponsibility"[] NOT NULL DEFAULT ARRAY[]::"AdminResponsibility"[],
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "deploymentRestrictionId" TEXT;

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'SYSTEM_DEFAULT',
    "generalAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_settings_singleton_chk" CHECK ("id" = 'SYSTEM_DEFAULT')
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_generalAdminUserId_key" ON "system_settings"("generalAdminUserId");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- CreateIndex
CREATE INDEX "users_deploymentRestrictionId_idx" ON "users"("deploymentRestrictionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_generalAdminUserId_fkey" FOREIGN KEY ("generalAdminUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default singleton configuration row
INSERT INTO "system_settings" ("id", "generalAdminUserId", "createdAt", "updatedAt")
VALUES ('SYSTEM_DEFAULT', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
