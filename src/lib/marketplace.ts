import type { Prisma, ListingCategory } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolveWorkspaceOwnerId } from "@/lib/project-access";
import { getCheckoutSession } from "@/lib/paymongo";

// Platform fee per category, matching the pricing doc's revenue-sharing table.
const PLATFORM_FEE_PERCENT: Record<ListingCategory, number> = {
  TEMPLATE: 15,
  COMPONENT: 15,
  EXTENSION: 15,
  COMPLETE_APP: 20,
  PROMPT_PACK: 10,
};

export function platformFeePercentFor(category: ListingCategory): number {
  return PLATFORM_FEE_PERCENT[category];
}

export function splitAmount(amountCents: number, category: ListingCategory): { platformFeeCents: number; creatorEarningsCents: number } {
  const platformFeeCents = Math.round((amountCents * platformFeePercentFor(category)) / 100);
  return { platformFeeCents, creatorEarningsCents: amountCents - platformFeeCents };
}

/** Clones a listing's plan/files into a new project owned by the buyer's workspace. */
export async function installListing(listingId: string, buyerId: string): Promise<string> {
  const listing = await prisma.marketplaceListing.findUniqueOrThrow({ where: { id: listingId } });
  const ownerId = await resolveWorkspaceOwnerId(buyerId);

  const project = await prisma.project.create({
    data: {
      name: listing.title,
      nameConfirmed: true,
      description: listing.description,
      status: "READY",
      userId: ownerId,
    },
  });

  await prisma.generatedApp.create({
    data: {
      projectId: project.id,
      plan: listing.plan as Prisma.InputJsonValue,
      files: listing.files as Prisma.InputJsonValue,
    },
  });

  return project.id;
}

/**
 * Settles a marketplace purchase — installs the listing and credits the creator. Called both from
 * the (already signature-verified) PayMongo webhook and, as a fallback, from the buyer's return
 * redirect in case the webhook hasn't arrived yet. Because the return redirect is a plain GET a
 * buyer controls, this independently re-verifies payment succeeded via the PayMongo API before
 * doing anything — never trust the caller alone. Idempotent.
 */
export async function settleMarketplacePurchase(checkoutSessionId: string): Promise<void> {
  const purchase = await prisma.marketplacePurchase.findUnique({ where: { paymongoCheckoutSessionId: checkoutSessionId } });
  if (!purchase || purchase.status === "PAID") return;

  const checkoutSession = await getCheckoutSession(checkoutSessionId);
  if (checkoutSession.attributes.payment_intent?.attributes.status !== "succeeded") return;

  const projectId = await installListing(purchase.listingId, purchase.buyerId);
  const listing = await prisma.marketplaceListing.findUniqueOrThrow({ where: { id: purchase.listingId } });

  await prisma.$transaction([
    prisma.marketplacePurchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", installedProjectId: projectId },
    }),
    prisma.user.update({
      where: { id: listing.creatorId },
      data: { creatorBalanceCents: { increment: purchase.creatorEarningsCents } },
    }),
  ]);
}
