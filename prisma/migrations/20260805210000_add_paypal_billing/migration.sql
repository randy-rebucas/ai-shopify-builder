-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "paypalSubscriptionId" TEXT,
  ADD COLUMN "paypalPlanId" TEXT,
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus",
  ADD COLUMN "subscriptionUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_paypalSubscriptionId_key" ON "User"("paypalSubscriptionId");
