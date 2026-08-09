import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requirePlatformAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "UNAUTHORIZED" as const, status: 401 as const };
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, platformRole: true, accountStatus: true },
  });
  if (actor?.platformRole !== "ADMIN" || actor.accountStatus !== "ACTIVE") {
    return { error: "FORBIDDEN" as const, status: 403 as const };
  }
  return { actor };
}
