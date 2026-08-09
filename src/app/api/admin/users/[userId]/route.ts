import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/security/admin";
import { setUserAccountStatus } from "@/lib/security/client-service";

const inputSchema = z.object({ accountStatus: z.enum(["ACTIVE", "DISABLED"]) });
export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const authorization = await requirePlatformAdmin();
  if ("error" in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { userId } = await context.params;
  if (userId === authorization.actor.id && parsed.data.accountStatus === "DISABLED") return NextResponse.json({ error: "CANNOT_DISABLE_SELF" }, { status: 409 });
  try {
    const user = await setUserAccountStatus(prisma, { actorUserId: authorization.actor.id, subjectUserId: userId, status: parsed.data.accountStatus });
    return NextResponse.json({ id: user.id, accountStatus: user.accountStatus });
  } catch {
    return NextResponse.json({ error: "USER_UPDATE_FAILED" }, { status: 404 });
  }
}
