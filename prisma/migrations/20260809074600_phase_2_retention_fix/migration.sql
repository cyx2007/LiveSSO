-- Audit actor/subject identifiers are immutable snapshots. Keeping foreign
-- keys would either rewrite append-only history or prevent account erasure.
ALTER TABLE "auditEvent" DROP CONSTRAINT "auditEvent_actorUserId_fkey";
ALTER TABLE "auditEvent" DROP CONSTRAINT "auditEvent_subjectUserId_fkey";

-- acceptedById may become NULL when an account is erased. acceptedAt remains
-- the durable terminal-state marker and the audit log carries actor context.
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_terminal_state_check";
ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_terminal_state_check" CHECK (
    ("status" = 'PENDING' AND "acceptedAt" IS NULL AND "acceptedById" IS NULL AND "revokedAt" IS NULL)
    OR ("status" = 'ACCEPTED' AND "acceptedAt" IS NOT NULL AND "revokedAt" IS NULL)
    OR ("status" = 'REVOKED' AND "acceptedAt" IS NULL AND "acceptedById" IS NULL AND "revokedAt" IS NOT NULL)
    OR ("status" = 'EXPIRED' AND "acceptedAt" IS NULL AND "acceptedById" IS NULL AND "revokedAt" IS NULL)
  );
