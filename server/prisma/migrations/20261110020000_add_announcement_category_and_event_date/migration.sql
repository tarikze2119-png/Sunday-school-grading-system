-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('GENERAL', 'EVENT', 'ACADEMIC');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "eventDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "announcements_category_idx" ON "announcements"("category");

-- CreateIndex
CREATE INDEX "announcements_eventDate_idx" ON "announcements"("eventDate");
