import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const username = process.env.BOOTSTRAP_USERNAME?.trim().toLowerCase();
const name = process.env.BOOTSTRAP_NAME?.trim();
const password = process.env.BOOTSTRAP_PASSWORD;

if (!email || !username || !name || !password) {
  throw new Error(
    "Set BOOTSTRAP_EMAIL, BOOTSTRAP_USERNAME, BOOTSTRAP_NAME and BOOTSTRAP_PASSWORD before running this command.",
  );
}

if (!/^[a-z0-9_]{3,32}$/.test(username)) {
  throw new Error("BOOTSTRAP_USERNAME must be 3-32 characters using lowercase letters, numbers or underscores.");
}

if (password.length < 12 || password.length > 128) {
  throw new Error("BOOTSTRAP_PASSWORD must be between 12 and 128 characters.");
}

const existingUsers = await prisma.user.count();

if (existingUsers > 0) {
  throw new Error("Initial user creation is locked because the database already contains a user.");
}

const userId = randomUUID();
const passwordHash = await hashPassword(password);

await prisma.user.create({
  data: {
    id: userId,
    name,
    email,
    emailVerified: true,
    username,
    displayUsername: username,
    accounts: {
      create: {
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
      },
    },
  },
});

console.info(`Created initial HFLive Auth user: ${username} <${email}>`);
await prisma.$disconnect();
