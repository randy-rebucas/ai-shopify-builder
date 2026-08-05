import { prisma } from "@/lib/db";
import type { PlanTier } from "@/generated/prisma/client";
import { PLAN_LIMITS, type PlanLimits } from "@/lib/plans";

function nextResetAt(from: Date): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

// Paid plans aren't auto-renewing subscriptions (PayMongo checkout sessions are one-off
// payments) — a paid plan is only valid until planExpiresAt, so reads lazily downgrade an
// expired user back to FREE instead of relying on a cron job to sweep for expirations.
export async function getEffectivePlan(userId: string): Promise<PlanTier> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (user.plan === "FREE" || user.plan === "ENTERPRISE") return user.plan;
  if (!user.planExpiresAt || user.planExpiresAt > new Date()) return user.plan;

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "FREE", planExpiresAt: null },
  });
  return "FREE";
}

// Credits are a rolling monthly allowance rather than a calendar-month one — resets exactly one
// month after they were last reset, whenever that falls, so a fresh signup gets a full 30 days.
async function ensureFreshCredits(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { aiCreditsUsed: true, aiCreditsResetAt: true },
  });

  if (new Date() < nextResetAt(user.aiCreditsResetAt)) return user;

  return prisma.user.update({
    where: { id: userId },
    data: { aiCreditsUsed: 0, aiCreditsResetAt: new Date() },
    select: { aiCreditsUsed: true, aiCreditsResetAt: true },
  });
}

export async function getProjectCount(userId: string): Promise<number> {
  return prisma.project.count({ where: { userId } });
}

export async function getConnectedStoreCount(userId: string): Promise<number> {
  return prisma.deploymentConfig.count({
    where: { installStatus: "INSTALLED", project: { userId } },
  });
}

export async function canCreateProject(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = PLAN_LIMITS[await getEffectivePlan(userId)];
  if (limits.maxProjects === null) return { allowed: true };

  const count = await getProjectCount(userId);
  if (count >= limits.maxProjects) {
    return {
      allowed: false,
      reason: `The ${limits.label} plan is limited to ${limits.maxProjects} project${limits.maxProjects === 1 ? "" : "s"}. Upgrade to create more.`,
    };
  }
  return { allowed: true };
}

export async function canConnectStore(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = PLAN_LIMITS[await getEffectivePlan(userId)];
  if (limits.maxStores === null) return { allowed: true };

  const count = await getConnectedStoreCount(userId);
  if (count >= limits.maxStores) {
    return {
      allowed: false,
      reason: `The ${limits.label} plan is limited to ${limits.maxStores} connected Shopify store${limits.maxStores === 1 ? "" : "s"}. Upgrade to connect more.`,
    };
  }
  return { allowed: true };
}

export async function canDeploy(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = PLAN_LIMITS[await getEffectivePlan(userId)];
  if (!limits.cloudDeployment) {
    return {
      allowed: false,
      reason: `Cloud deployment isn't included in the ${limits.label} plan. Upgrade to deploy your app.`,
    };
  }
  return { allowed: true };
}

type FeatureFlag = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

async function checkFeature(
  userId: string,
  flag: FeatureFlag,
  featureLabel: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = PLAN_LIMITS[await getEffectivePlan(userId)];
  if (!limits[flag]) {
    return { allowed: false, reason: `${featureLabel} isn't included in the ${limits.label} plan. Upgrade to unlock it.` };
  }
  return { allowed: true };
}

export function canViewVersionHistory(userId: string) {
  return checkFeature(userId, "versionHistory", "Version history");
}

export function canUseAiDebugger(userId: string) {
  return checkFeature(userId, "aiDebugger", "The AI debugger");
}

export function canViewBuildHistory(userId: string) {
  return checkFeature(userId, "buildHistory", "Build history");
}

export function canUseGithubIntegration(userId: string) {
  return checkFeature(userId, "githubIntegration", "GitHub integration");
}

export function canUsePerformanceAnalysis(userId: string) {
  return checkFeature(userId, "performanceAnalysis", "Performance analysis");
}

export function canPublishToMarketplace(userId: string) {
  return checkFeature(userId, "marketplacePublishing", "Marketplace publishing");
}

export async function canInviteTeamMember(ownerId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = PLAN_LIMITS[await getEffectivePlan(ownerId)];
  if (!limits.teamCollaboration) {
    return { allowed: false, reason: `Team collaboration isn't included in the ${limits.label} plan. Upgrade to invite teammates.` };
  }
  if (limits.maxTeamMembers === null) return { allowed: true };

  const count = await prisma.teamMember.count({ where: { ownerId, status: { in: ["PENDING", "ACTIVE"] } } });
  if (count >= limits.maxTeamMembers) {
    return {
      allowed: false,
      reason: `The ${limits.label} plan is limited to ${limits.maxTeamMembers} team member${limits.maxTeamMembers === 1 ? "" : "s"}. Upgrade to invite more.`,
    };
  }
  return { allowed: true };
}

export async function consumeAiCredits(
  userId: string,
  amount: number,
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const limits = PLAN_LIMITS[await getEffectivePlan(userId)];
  const fresh = await ensureFreshCredits(userId);

  if (limits.aiCreditsPerMonth === null) return { allowed: true };

  if (fresh.aiCreditsUsed + amount > limits.aiCreditsPerMonth) {
    return {
      allowed: false,
      reason: `You've used all ${limits.aiCreditsPerMonth} AI credits included in the ${limits.label} plan this month. Upgrade for more credits.`,
      remaining: Math.max(0, limits.aiCreditsPerMonth - fresh.aiCreditsUsed),
    };
  }

  await prisma.user.update({ where: { id: userId }, data: { aiCreditsUsed: { increment: amount } } });
  return { allowed: true, remaining: limits.aiCreditsPerMonth - fresh.aiCreditsUsed - amount };
}
