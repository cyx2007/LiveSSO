import { hashPassword } from "better-auth/crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSecurityHashSecret } from "@/lib/env";
import { sendSecurityNotice } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { digestSensitiveValue } from "@/lib/security/digest";
import { consumeInvitation } from "@/lib/security/domain-store";

const inputSchema = z.object({
  token: z.string().min(20).max(200),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVITATION_INVALID" }, { status: 400 });
  const separator = parsed.data.token.indexOf(".");
  const id = parsed.data.token.slice(0, separator);
  const rawToken = parsed.data.token.slice(separator + 1);
  if (separator < 1 || !rawToken) return NextResponse.json({ error: "INVITATION_INVALID" }, { status: 400 });
  const tokenDigest = digestSensitiveValue("invitation-token", rawToken, getSecurityHashSecret());
  const password = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const invitation = await transaction.invitation.findFirst({
        where: { id, tokenDigest, status: "PENDING", expiresAt: { gt: new Date() } },
      });
      if (!invitation) throw new Error("INVALID_INVITATION");
      const created = await transaction.user.create({
        data: {
          email: invitation.normalizedEmail,
          emailVerified: true,
          username: parsed.data.username.toLowerCase(),
          displayUsername: parsed.data.username,
          name: parsed.data.name,
          platformRole: "USER",
          accounts: {
            create: { providerId: "credential", accountId: invitation.normalizedEmail, password },
          },
        },
      });
      if (!(await consumeInvitation(transaction, { id, tokenDigest, acceptedById: created.id }))) {
        throw new Error("INVALID_INVITATION");
      }
      await transaction.auditEvent.create({
        data: {
          eventType: "invitation.accepted",
          actorType: "USER",
          actorUserId: created.id,
          subjectUserId: created.id,
          outcome: "SUCCESS",
          metadata: { invitationId: id },
          expiresAt: new Date(Date.now() + 400 * 24 * 60 * 60 * 1_000),
        },
      });
      return created;
    });
    await sendSecurityNotice(user.email, "你的 HFLive 账号已通过邀请创建。" ).catch(() => undefined);
    return NextResponse.json({ status: true });
  } catch {
    return NextResponse.json({ error: "INVITATION_INVALID" }, { status: 400 });
  }
}
