-- CreateTable: grading_schemes
CREATE TABLE "grading_schemes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: grading_scheme_versions
CREATE TABLE "grading_scheme_versions" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grading_scheme_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: grading_components
CREATE TABLE "grading_components" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "defaultMaxScore" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "orderIndex" INTEGER NOT NULL DEFAULT 1,
    "type" "AssessmentType" NOT NULL DEFAULT 'HOMEWORK_ASSIGNMENT',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grading_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable: course_grading_schemes
CREATE TABLE "course_grading_schemes" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "originSchemeId" TEXT,
    "originVersionId" TEXT,
    "name" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalWeight" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "appliedById" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_grading_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: course_grading_components
CREATE TABLE "course_grading_components" (
    "id" TEXT NOT NULL,
    "courseGradingSchemeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "orderIndex" INTEGER NOT NULL DEFAULT 1,
    "type" "AssessmentType" NOT NULL DEFAULT 'HOMEWORK_ASSIGNMENT',
    "assessmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_grading_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable: grade_calculation_snapshots
CREATE TABLE "grade_calculation_snapshots" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "courseGradingSchemeId" TEXT,
    "reason" TEXT NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_calculation_snapshots_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "grading_schemes_name_key" ON "grading_schemes"("name");
CREATE INDEX "grading_schemes_status_idx" ON "grading_schemes"("status");

CREATE UNIQUE INDEX "grading_scheme_versions_schemeId_versionNumber_key" ON "grading_scheme_versions"("schemeId", "versionNumber");
CREATE INDEX "grading_scheme_versions_schemeId_idx" ON "grading_scheme_versions"("schemeId");

CREATE UNIQUE INDEX "grading_components_versionId_name_key" ON "grading_components"("versionId", "name");
CREATE INDEX "grading_components_versionId_idx" ON "grading_components"("versionId");

CREATE UNIQUE INDEX "course_grading_schemes_courseOfferingId_versionNumber_key" ON "course_grading_schemes"("courseOfferingId", "versionNumber");
CREATE INDEX "course_grading_schemes_courseOfferingId_idx" ON "course_grading_schemes"("courseOfferingId");
CREATE INDEX "course_grading_schemes_isActive_idx" ON "course_grading_schemes"("isActive");

CREATE UNIQUE INDEX "course_grading_components_courseGradingSchemeId_name_key" ON "course_grading_components"("courseGradingSchemeId", "name");
CREATE INDEX "course_grading_components_courseGradingSchemeId_idx" ON "course_grading_components"("courseGradingSchemeId");

CREATE INDEX "grade_calculation_snapshots_courseOfferingId_idx" ON "grade_calculation_snapshots"("courseOfferingId");
CREATE INDEX "grade_calculation_snapshots_createdAt_idx" ON "grade_calculation_snapshots"("createdAt");

-- Foreign Keys
ALTER TABLE "grading_schemes" ADD CONSTRAINT "grading_schemes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "grading_scheme_versions" ADD CONSTRAINT "grading_scheme_versions_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "grading_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "grading_components" ADD CONSTRAINT "grading_components_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "grading_scheme_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_grading_schemes" ADD CONSTRAINT "course_grading_schemes_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_grading_schemes" ADD CONSTRAINT "course_grading_schemes_originSchemeId_fkey" FOREIGN KEY ("originSchemeId") REFERENCES "grading_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_grading_schemes" ADD CONSTRAINT "course_grading_schemes_originVersionId_fkey" FOREIGN KEY ("originVersionId") REFERENCES "grading_scheme_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "course_grading_components" ADD CONSTRAINT "course_grading_components_courseGradingSchemeId_fkey" FOREIGN KEY ("courseGradingSchemeId") REFERENCES "course_grading_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "grade_calculation_snapshots" ADD CONSTRAINT "grade_calculation_snapshots_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grade_calculation_snapshots" ADD CONSTRAINT "grade_calculation_snapshots_courseGradingSchemeId_fkey" FOREIGN KEY ("courseGradingSchemeId") REFERENCES "course_grading_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grade_calculation_snapshots" ADD CONSTRAINT "grade_calculation_snapshots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
