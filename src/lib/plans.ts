import type { PlanTier } from "@/generated/prisma/client";

/** Tiers sold as a one-month PayMongo checkout. FREE has no billing; ENTERPRISE is sales-assisted. */
export const BILLABLE_PLANS = ["STARTER", "PROFESSIONAL", "AGENCY"] as const;
export type BillablePlan = (typeof BILLABLE_PLANS)[number];

export function isBillablePlan(value: string): value is BillablePlan {
  return (BILLABLE_PLANS as readonly string[]).includes(value);
}

// PayMongo only settles in PHP — prices are configured in USD cents (what we actually advertise
// on the pricing page) and converted to PHP centavos at checkout time via a configurable rate.
const PAYMONGO_USD_CENTS_ENV: Record<BillablePlan, string> = {
  STARTER: "PAYMONGO_PRICE_STARTER",
  PROFESSIONAL: "PAYMONGO_PRICE_PROFESSIONAL",
  AGENCY: "PAYMONGO_PRICE_AGENCY",
};

function usdCentsFor(tier: BillablePlan): number {
  const envName = PAYMONGO_USD_CENTS_ENV[tier];
  const value = process.env[envName];
  if (!value) throw new Error(`${envName} is not configured — set the plan price (in USD cents) first.`);
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents <= 0) throw new Error(`${envName} must be a positive integer (USD cents).`);
  return cents;
}

function usdToPhpRate(): number {
  const value = process.env.PAYMONGO_USD_TO_PHP_RATE;
  const rate = value ? Number(value) : 58;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("PAYMONGO_USD_TO_PHP_RATE must be a positive number.");
  return rate;
}

/** PHP centavos to charge via PayMongo for a tier's USD-cent list price. */
export function paymongoAmountFor(tier: BillablePlan): number {
  return Math.round(usdCentsFor(tier) * usdToPhpRate());
}

export interface PlanLimits {
  label: string;
  maxProjects: number | null;
  maxStores: number | null;
  aiCreditsPerMonth: number | null;
  cloudDeployment: boolean;
  teamCollaboration: boolean;
  maxTeamMembers: number | null;
  marketplacePublishing: boolean;
  premiumAiModels: boolean;
  versionHistory: boolean;
  aiDebugger: boolean;
  buildHistory: boolean;
  emailSupport: boolean;
  githubIntegration: boolean;
  performanceAnalysis: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    label: "Free",
    maxProjects: 1,
    maxStores: 1,
    aiCreditsPerMonth: 50,
    cloudDeployment: false,
    teamCollaboration: false,
    maxTeamMembers: 0,
    marketplacePublishing: false,
    premiumAiModels: false,
    versionHistory: false,
    aiDebugger: false,
    buildHistory: false,
    emailSupport: false,
    githubIntegration: false,
    performanceAnalysis: false,
    prioritySupport: false,
  },
  STARTER: {
    label: "Starter",
    maxProjects: 5,
    maxStores: 2,
    aiCreditsPerMonth: 1000,
    cloudDeployment: true,
    teamCollaboration: false,
    maxTeamMembers: 0,
    marketplacePublishing: false,
    premiumAiModels: false,
    versionHistory: true,
    aiDebugger: true,
    buildHistory: true,
    emailSupport: true,
    githubIntegration: false,
    performanceAnalysis: false,
    prioritySupport: false,
  },
  PROFESSIONAL: {
    label: "Professional",
    maxProjects: null,
    maxStores: 10,
    aiCreditsPerMonth: 5000,
    cloudDeployment: true,
    teamCollaboration: true,
    maxTeamMembers: 5,
    marketplacePublishing: true,
    premiumAiModels: true,
    versionHistory: true,
    aiDebugger: true,
    buildHistory: true,
    emailSupport: true,
    githubIntegration: true,
    performanceAnalysis: true,
    prioritySupport: true,
  },
  AGENCY: {
    label: "Agency",
    maxProjects: null,
    maxStores: null,
    aiCreditsPerMonth: 20000,
    cloudDeployment: true,
    teamCollaboration: true,
    maxTeamMembers: null,
    marketplacePublishing: true,
    premiumAiModels: true,
    versionHistory: true,
    aiDebugger: true,
    buildHistory: true,
    emailSupport: true,
    githubIntegration: true,
    performanceAnalysis: true,
    prioritySupport: true,
  },
  ENTERPRISE: {
    label: "Enterprise",
    maxProjects: null,
    maxStores: null,
    aiCreditsPerMonth: null,
    cloudDeployment: true,
    teamCollaboration: true,
    maxTeamMembers: null,
    marketplacePublishing: true,
    premiumAiModels: true,
    versionHistory: true,
    aiDebugger: true,
    buildHistory: true,
    emailSupport: true,
    githubIntegration: true,
    performanceAnalysis: true,
    prioritySupport: true,
  },
};
