CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TABLE "user"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
