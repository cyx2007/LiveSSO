import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { createApprovedClient } from "../src/lib/security/client-service";

const suffix = randomUUID().replaceAll("-", "").slice(0, 20);
const username = `p4_smoke_${suffix}`;
const email = `${username}@example.invalid`;
const password = `P4-${randomBytes(24).toString("base64url")}`;
let userId: string | undefined;
let clientId: string | undefined;
let adminId: string | undefined;

try {
  const user = await prisma.user.create({
    data: {
      name: "Phase 4 OIDC smoke",
      username,
      email,
      emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: email, password: await hashPassword(password) } },
    },
  });
  userId = user.id;
  const admin = await prisma.user.create({ data: { name: "Phase 4 smoke admin", email: `p4-smoke-admin-${suffix}@example.invalid`, emailVerified: true, platformRole: "ADMIN" } });
  adminId = admin.id;
  const client = await createApprovedClient(prisma, { actorUserId: admin.id, name: "Phase 4 OIDC smoke", redirectUris: ["http://127.0.0.1:4100/callback"], scopes: ["openid", "profile", "email", "offline_access"] });
  clientId = client.clientId;
  process.env.OIDC_SMOKE_USERNAME = username;
  process.env.OIDC_SMOKE_PASSWORD = password;
  process.env.OIDC_SMOKE_CLIENT_ID = client.clientId;
  process.env.OIDC_SMOKE_CLIENT_SECRET = client.clientSecret;
  await import("./oidc-smoke");
} finally {
  if (clientId) await prisma.oauthClient.delete({ where: { clientId } }).catch(() => undefined);
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
  await prisma.$disconnect();
}
