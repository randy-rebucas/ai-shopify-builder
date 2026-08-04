-- CreateEnum
CREATE TYPE "HostingProvider" AS ENUM ('FLY', 'RENDER', 'RAILWAY', 'HEROKU', 'VM');

-- CreateTable
CREATE TABLE "DeploymentConfig" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appVersion" TEXT NOT NULL DEFAULT '0.1.0',
    "shopifyPartnerTokenCiphertext" TEXT,
    "shopifyOrgId" TEXT,
    "hostingProvider" "HostingProvider",
    "hostingTokenCiphertext" TEXT,
    "hostingConfig" JSONB,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "DeploymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentConfig_projectId_key" ON "DeploymentConfig"("projectId");

-- AddForeignKey
ALTER TABLE "DeploymentConfig" ADD CONSTRAINT "DeploymentConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
