import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileAvatarForm } from "@/components/profile-avatar-form";
import { auth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "身份资料" };

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?returnTo=/profile");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true, accountStatus: true } });
  if (user?.accountStatus !== "ACTIVE") redirect("/error?code=forbidden");
  return <main className="profile-shell"><ProfileAvatarForm initialPicture={user.image} storageEnabled={getServerEnv().OBJECT_STORAGE_ENABLED} /></main>;
}
