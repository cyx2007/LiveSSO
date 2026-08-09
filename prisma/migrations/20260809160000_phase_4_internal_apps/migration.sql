CREATE TYPE "ClientApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "oauthClient"
  ADD COLUMN "approvalStatus" "ClientApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Existing development clients were created through the pre-Phase-4 administrator
-- bootstrap path. Preserve them as explicitly approved during the upgrade.
UPDATE "oauthClient"
   SET "approvalStatus" = 'APPROVED',
       "approvedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP);

CREATE TABLE "clientWebhook" (
  "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  "clientId" VARCHAR(255) NOT NULL,
  "endpointUrl" VARCHAR(2048) NOT NULL,
  "signingSecretCiphertext" TEXT NOT NULL,
  "eventTypes" TEXT[] NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clientWebhook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clientWebhook_clientId_key" ON "clientWebhook"("clientId");
CREATE INDEX "clientWebhook_active_idx" ON "clientWebhook"("active");
CREATE INDEX "oauthClient_approvalStatus_disabled_idx" ON "oauthClient"("approvalStatus", "disabled");
CREATE INDEX "oauthClient_approvedById_idx" ON "oauthClient"("approvedById");

ALTER TABLE "oauthClient" ADD CONSTRAINT "oauthClient_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clientWebhook" ADD CONSTRAINT "clientWebhook_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oauthClient" ADD CONSTRAINT "oauthClient_approval_state_check" CHECK (
  ("approvalStatus" = 'APPROVED' AND "approvedAt" IS NOT NULL)
  OR ("approvalStatus" <> 'APPROVED')
);
ALTER TABLE "oauthClient" ADD CONSTRAINT "oauthClient_unapproved_disabled_check" CHECK (
  "approvalStatus" = 'APPROVED' OR "disabled" IS TRUE
);
