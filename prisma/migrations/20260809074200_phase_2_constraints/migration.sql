-- Only one active invitation may exist for a normalized address. Historical
-- accepted/revoked/expired rows remain available for audit and support.
CREATE UNIQUE INDEX "invitation_one_pending_per_email"
    ON "invitation" ("normalizedEmail")
 WHERE "status" = 'PENDING'::"InvitationStatus";

ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_terminal_state_check" CHECK (
    ("status" = 'PENDING' AND "acceptedAt" IS NULL AND "acceptedById" IS NULL AND "revokedAt" IS NULL)
    OR ("status" = 'ACCEPTED' AND "acceptedAt" IS NOT NULL AND "acceptedById" IS NOT NULL AND "revokedAt" IS NULL)
    OR ("status" = 'REVOKED' AND "acceptedAt" IS NULL AND "acceptedById" IS NULL AND "revokedAt" IS NOT NULL)
    OR ("status" = 'EXPIRED' AND "acceptedAt" IS NULL AND "acceptedById" IS NULL AND "revokedAt" IS NULL)
  ),
  ADD CONSTRAINT "invitation_expiry_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "trustedDevice"
  ADD CONSTRAINT "trusted_device_time_check" CHECK (
    "expiresAt" > "createdAt"
    AND "lastUsedAt" >= "createdAt"
    AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
  );

ALTER TABLE "loginChallenge"
  ADD CONSTRAINT "login_challenge_attempt_check" CHECK (
    "attemptCount" >= 0 AND "maxAttempts" > 0 AND "attemptCount" <= "maxAttempts"
  ),
  ADD CONSTRAINT "login_challenge_risk_check" CHECK ("riskScore" >= 0),
  ADD CONSTRAINT "login_challenge_expiry_check" CHECK ("expiresAt" > "createdAt"),
  ADD CONSTRAINT "login_challenge_terminal_state_check" CHECK (
    ("status" IN ('PENDING', 'LOCKED', 'EXPIRED') AND "consumedAt" IS NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'CANCELLED' AND "consumedAt" IS NULL AND "cancelledAt" IS NOT NULL)
  );

ALTER TABLE "profileAsset"
  ADD CONSTRAINT "profile_asset_shape_check" CHECK (
    "version" > 0
    AND "byteSize" >= 0
    AND ("width" IS NULL OR "width" > 0)
    AND ("height" IS NULL OR "height" > 0)
  );

ALTER TABLE "outboxEvent"
  ADD CONSTRAINT "outbox_attempt_check" CHECK (
    "attemptCount" >= 0 AND "maxAttempts" > 0 AND "attemptCount" <= "maxAttempts"
  ),
  ADD CONSTRAINT "outbox_lease_state_check" CHECK (
    ("status" = 'PROCESSING' AND "leaseId" IS NOT NULL AND "lockedAt" IS NOT NULL AND "lockedUntil" IS NOT NULL)
    OR ("status" <> 'PROCESSING' AND "leaseId" IS NULL AND "lockedAt" IS NULL AND "lockedUntil" IS NULL)
  ),
  ADD CONSTRAINT "outbox_delivery_state_check" CHECK (
    ("status" = 'DELIVERED' AND "deliveredAt" IS NOT NULL)
    OR ("status" <> 'DELIVERED' AND "deliveredAt" IS NULL)
  );

-- Audit rows are append-only until their declared retention period ends. The
-- cleanup job may delete expired rows, but no caller can rewrite history.
CREATE FUNCTION hflive_guard_audit_event() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit events are append-only';
  END IF;

  IF OLD."expiresAt" > CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'audit event retention period has not elapsed';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER "auditEvent_append_only"
BEFORE UPDATE OR DELETE ON "auditEvent"
FOR EACH ROW EXECUTE FUNCTION hflive_guard_audit_event();
