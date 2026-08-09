import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/security/admin";
import { CLIENT_SCOPES, rotateClientSecret, setClientDisabled, updateClientConfiguration } from "@/lib/security/client-service";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable") }),
  z.object({ action: z.literal("enable") }),
  z.object({ action: z.literal("rotate_secret") }),
  z.object({ action: z.literal("update_configuration"), redirectUris: z.array(z.url()).max(20), scopes: z.array(z.enum(CLIENT_SCOPES)).min(1) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ clientId: string }> }) {
  const authorization = await requirePlatformAdmin();
  if ("error" in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { clientId } = await context.params;
  if (parsed.data.action === "update_configuration") {
    try {
      const updated = await updateClientConfiguration(prisma, { actorUserId: authorization.actor.id, clientId, redirectUris: parsed.data.redirectUris, scopes: parsed.data.scopes });
      if (!updated) return NextResponse.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ status: true });
    } catch {
      return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400 });
    }
  }
  if (parsed.data.action === "rotate_secret") {
    const clientSecret = await rotateClientSecret(prisma, authorization.actor.id, clientId);
    if (!clientSecret) return NextResponse.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ clientId, clientSecret }, { headers: { "cache-control": "no-store", pragma: "no-cache" } });
  }
  const updated = await setClientDisabled(prisma, authorization.actor.id, clientId, parsed.data.action === "disable");
  if (!updated) return NextResponse.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ status: true });
}
