import { prisma } from "@/lib/prisma";
import { claimOutboxEvents, completeOutboxEvent, failOutboxEvent } from "@/lib/security/domain-store";
import { decryptWebhookSecret, signWebhookPayload } from "@/lib/security/webhook-secret";

function retryDelay(attempt: number) {
  return Math.min(60 * 60_000, 2 ** Math.min(attempt, 10) * 1_000);
}

export async function dispatchOutboxBatch(input: { limit?: number; fetchImpl?: typeof fetch; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const events = await claimOutboxEvents(prisma, { limit: input.limit ?? 20, leaseDurationMs: 60_000, now });
  const fetchImpl = input.fetchImpl ?? fetch;
  const results = await Promise.all(events.map(async (event) => {
    const payload = event.payload as { webhookId?: string };
    const webhook = payload.webhookId ? await prisma.clientWebhook.findUnique({
      where: { id: payload.webhookId },
      include: { client: { select: { disabled: true, approvalStatus: true } } },
    }) : null;
    if (!webhook || !webhook.active || webhook.client.disabled || webhook.client.approvalStatus !== "APPROVED") {
      await completeOutboxEvent(prisma, { id: event.id, leaseId: event.leaseId, now });
      return { id: event.id, status: "discarded" as const };
    }
    const body = JSON.stringify({ id: event.id, type: event.eventType, ...event.payload as object });
    const timestamp = Math.floor(now.getTime() / 1_000);
    try {
      const response = await fetchImpl(webhook.endpointUrl, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "content-type": "application/json",
          "user-agent": "HFLive-Auth-Events/1.0",
          "x-hflive-event-id": event.id,
          "x-hflive-timestamp": String(timestamp),
          "x-hflive-signature": signWebhookPayload(decryptWebhookSecret(webhook.signingSecretCiphertext), timestamp, body),
        },
        body,
      });
      const responseStatus = response.status;
      await response.body?.cancel();
      if (!response.ok) throw new Error(`HTTP_${responseStatus}`);
      await completeOutboxEvent(prisma, { id: event.id, leaseId: event.leaseId, now });
      return { id: event.id, status: "delivered" as const };
    } catch (error) {
      const code = error instanceof Error && /^HTTP_\d{3}$/.test(error.message) ? error.message : "DELIVERY_FAILED";
      await failOutboxEvent(prisma, { id: event.id, leaseId: event.leaseId, errorCode: code, retryAt: new Date(now.getTime() + retryDelay(event.attemptCount)), now });
      return { id: event.id, status: "retry" as const };
    }
  }));
  return { claimed: events.length, delivered: results.filter((r) => r.status === "delivered").length, retried: results.filter((r) => r.status === "retry").length, discarded: results.filter((r) => r.status === "discarded").length };
}
