-- CreateEnum
CREATE TYPE "DeployStatus" AS ENUM ('NONE', 'DEPLOYING', 'DEPLOYED', 'FAILED');

-- AlterTable
ALTER TABLE "DeploymentConfig" ADD COLUMN     "deployError" TEXT,
ADD COLUMN     "deployStatus" "DeployStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "deployedAppName" TEXT,
ADD COLUMN     "deployedAt" TIMESTAMP(3),
ADD COLUMN     "deployedUrl" TEXT;
