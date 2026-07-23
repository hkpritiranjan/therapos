-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'WAITLIST', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('INDIVIDUAL', 'COUPLES', 'FAMILY', 'GROUP');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "NoteFormat" AS ENUM ('SOAP', 'DAP', 'BIRP', 'FREE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "HomeworkStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'PARTIAL', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'SOLO', 'CLINIC');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "credentials" TEXT[],
    "modalities" TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "primaryConcerns" TEXT[],
    "diagnoses" TEXT[],
    "modality" TEXT,
    "sessionFreq" TEXT,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "aiSummary" TEXT,
    "aiSummaryUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMins" INTEGER,
    "type" "SessionType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "aiPrep" JSONB,
    "aiPrepGenAt" TIMESTAMP(3),
    "rawNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionNote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "format" "NoteFormat" NOT NULL DEFAULT 'SOAP',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "data" TEXT,
    "dapAssessment" TEXT,
    "dapPlan" TEXT,
    "behavior" TEXT,
    "intervention" TEXT,
    "birpResponse" TEXT,
    "birpPlan" TEXT,
    "freeText" TEXT,
    "aiDraft" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT,
    "editedAt" TIMESTAMP(3),
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "wordCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achievedAt" TIMESTAMP(3),
    "progressNotes" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "dueBy" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "status" "HomeworkStatus" NOT NULL DEFAULT 'ASSIGNED',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteEmbedding" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientEmbedding" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'TRIAL',
    "status" "SubStatus" NOT NULL DEFAULT 'TRIALING',
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Patient_therapistId_idx" ON "Patient"("therapistId");

-- CreateIndex
CREATE INDEX "Patient_therapistId_status_idx" ON "Patient"("therapistId", "status");

-- CreateIndex
CREATE INDEX "Session_patientId_idx" ON "Session"("patientId");

-- CreateIndex
CREATE INDEX "Session_therapistId_idx" ON "Session"("therapistId");

-- CreateIndex
CREATE INDEX "Session_therapistId_scheduledAt_idx" ON "Session"("therapistId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_patientId_sessionNumber_key" ON "Session"("patientId", "sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SessionNote_sessionId_key" ON "SessionNote"("sessionId");

-- CreateIndex
CREATE INDEX "Goal_patientId_idx" ON "Goal"("patientId");

-- CreateIndex
CREATE INDEX "Homework_patientId_idx" ON "Homework"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteEmbedding_noteId_key" ON "NoteEmbedding"("noteId");

-- CreateIndex
CREATE INDEX "NoteEmbedding_patientId_idx" ON "NoteEmbedding"("patientId");

-- CreateIndex
CREATE INDEX "NoteEmbedding_therapistId_idx" ON "NoteEmbedding"("therapistId");

-- CreateIndex
CREATE INDEX "PatientEmbedding_patientId_idx" ON "PatientEmbedding"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_idx" ON "AuditLog"("patientId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteEmbedding" ADD CONSTRAINT "NoteEmbedding_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "SessionNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientEmbedding" ADD CONSTRAINT "PatientEmbedding_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

