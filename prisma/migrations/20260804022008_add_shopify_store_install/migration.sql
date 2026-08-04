-- CreateEnum
CREATE TYPE "InstallStatus" AS ENUM ('NONE', 'INSTALLED', 'FAILED');

-- AlterTable
ALTER TABLE "DeploymentConfig" ADD COLUMN     "installError" TEXT,
ADD COLUMN     "installStatus" "InstallStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "installedAt" TIMESTAMP(3),
ADD COLUMN     "shopifyAdminAccessTokenCiphertext" TEXT,
ADD COLUMN     "shopifyGrantedScopes" TEXT,
ADD COLUMN     "shopifyShopDomain" TEXT;
