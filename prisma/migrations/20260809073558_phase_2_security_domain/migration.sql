-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoginChallengeStatus" AS ENUM ('PENDING', 'CONSUMED', 'LOCKED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'CLIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProfileAssetStatus" AS ENUM ('PENDING', 'ACTIVE', 'REPLACED', 'DELETED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'DEAD_LETTER');

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "jwks" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "oauthAccessToken" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "oauthClient" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "oauthConsent" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "oauthRefreshToken" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "rateLimit" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- CreateTable
CREATE TABLE "invitation" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "tokenDigest" VARCHAR(80) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "grantedRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "invitedById" UUID,
    "acceptedById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trustedDevice" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenDigest" VARCHAR(80) NOT NULL,
    "label" VARCHAR(120),
    "userAgentDigest" VARCHAR(80),
    "firstIpDigest" VARCHAR(80),
    "lastIpDigest" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "trustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loginChallenge" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "userId" UUID NOT NULL,
    "bindingDigest" VARCHAR(80) NOT NULL,
    "otpDigest" VARCHAR(80) NOT NULL,
    "status" "LoginChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "riskReasons" TEXT[],
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "ipDigest" VARCHAR(80),
    "userAgentDigest" VARCHAR(80),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditEvent" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "eventType" VARCHAR(100) NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorUserId" UUID,
    "subjectUserId" UUID,
    "clientId" VARCHAR(255),
    "outcome" "AuditOutcome" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "requestId" VARCHAR(120),
    "ipDigest" VARCHAR(80),
    "userAgentDigest" VARCHAR(80),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profileAsset" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "userId" UUID NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProfileAssetStatus" NOT NULL DEFAULT 'PENDING',
    "contentType" VARCHAR(100) NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "profileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outboxEvent" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "aggregateType" VARCHAR(100) NOT NULL,
    "aggregateId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseId" UUID,
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "lastErrorCode" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokenDigest_key" ON "invitation"("tokenDigest");

-- CreateIndex
CREATE INDEX "invitation_normalizedEmail_status_idx" ON "invitation"("normalizedEmail", "status");

-- CreateIndex
CREATE INDEX "invitation_invitedById_idx" ON "invitation"("invitedById");

-- CreateIndex
CREATE INDEX "invitation_acceptedById_idx" ON "invitation"("acceptedById");

-- CreateIndex
CREATE INDEX "invitation_status_expiresAt_idx" ON "invitation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "trustedDevice_tokenDigest_key" ON "trustedDevice"("tokenDigest");

-- CreateIndex
CREATE INDEX "trustedDevice_userId_expiresAt_idx" ON "trustedDevice"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "trustedDevice_expiresAt_idx" ON "trustedDevice"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "loginChallenge_bindingDigest_key" ON "loginChallenge"("bindingDigest");

-- CreateIndex
CREATE INDEX "loginChallenge_userId_status_idx" ON "loginChallenge"("userId", "status");

-- CreateIndex
CREATE INDEX "loginChallenge_status_expiresAt_idx" ON "loginChallenge"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "auditEvent_eventType_createdAt_idx" ON "auditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "auditEvent_actorUserId_createdAt_idx" ON "auditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "auditEvent_subjectUserId_createdAt_idx" ON "auditEvent"("subjectUserId", "createdAt");

-- CreateIndex
CREATE INDEX "auditEvent_clientId_createdAt_idx" ON "auditEvent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "auditEvent_expiresAt_idx" ON "auditEvent"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "profileAsset_objectKey_key" ON "profileAsset"("objectKey");

-- CreateIndex
CREATE INDEX "profileAsset_userId_status_idx" ON "profileAsset"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "profileAsset_userId_version_key" ON "profileAsset"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "outboxEvent_idempotencyKey_key" ON "outboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "outboxEvent_status_availableAt_idx" ON "outboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outboxEvent_status_lockedUntil_idx" ON "outboxEvent"("status", "lockedUntil");

-- CreateIndex
CREATE INDEX "outboxEvent_aggregateType_aggregateId_createdAt_idx" ON "outboxEvent"("aggregateType", "aggregateId", "createdAt");

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trustedDevice" ADD CONSTRAINT "trustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loginChallenge" ADD CONSTRAINT "loginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditEvent" ADD CONSTRAINT "auditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditEvent" ADD CONSTRAINT "auditEvent_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileAsset" ADD CONSTRAINT "profileAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
