-- CreateTable
CREATE TABLE "DeployAttempt" (
    "id" TEXT NOT NULL,
    "status" "DeployStatus" NOT NULL,
    "url" TEXT,
    "error" TEXT,
    "autoFixLog" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,

    CONSTRAINT "DeployAttempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeployAttempt" ADD CONSTRAINT "DeployAttempt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
