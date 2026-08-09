import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/security/admin";

export async function GET(request: Request) {
  const authorization = await requirePlatformAdmin();
  if ("error" in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50));
  const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { id: true, eventType: true, actorType: true, actorUserId: true, subjectUserId: true, clientId: true, outcome: true, severity: true, metadata: true, createdAt: true } });
  return NextResponse.json({ events });
}
