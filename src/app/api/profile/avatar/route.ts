import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ProfileImageError, profileImageUrl, replaceProfileImage } from "@/lib/security/profile-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountStatus: true } });
  if (user?.accountStatus !== "ACTIVE") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择头像文件。" }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "头像文件必须小于 8 MiB。" }, { status: 413 });
    const env = getServerEnv();
    if (!env.OBJECT_STORAGE_ENABLED) return NextResponse.json({ error: "当前实例未启用头像存储。" }, { status: 503 });
    const asset = await replaceProfileImage(prisma, { userId: session.user.id, origin: env.BETTER_AUTH_URL.replace(/\/$/, ""), source: new Uint8Array(await file.arrayBuffer()) });
    return NextResponse.json({ picture: profileImageUrl(env.BETTER_AUTH_URL.replace(/\/$/, ""), session.user.id, asset.version), version: asset.version }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ProfileImageError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Profile image upload failed", { cause: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "头像保存失败，请稍后重试。" }, { status: 500 });
  }
}
