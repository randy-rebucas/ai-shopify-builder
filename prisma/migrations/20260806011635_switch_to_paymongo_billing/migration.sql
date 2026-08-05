-- DropIndex
DROP INDEX "User_paypalSubscriptionId_key";

-- AlterTable
ALTER TABLE "User"
  DROP COLUMN "paypalSubscriptionId",
  DROP COLUMN "paypalPlanId",
  DROP COLUMN "subscriptionStatus",
  DROP COLUMN "subscriptionUpdatedAt",
  ADD COLUMN "paymongoCheckoutSessionId" TEXT,
  ADD COLUMN "planExpiresAt" TIMESTAMP(3);

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "User_paymongoCheckoutSessionId_key" ON "User"("paymongoCheckoutSessionId");
