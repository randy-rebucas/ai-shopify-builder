-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubConnectedAt" TIMESTAMP(3),
ADD COLUMN     "githubRepoFullName" TEXT,
ADD COLUMN     "githubRepoUrl" TEXT,
ADD COLUMN     "githubTokenCiphertext" TEXT;
