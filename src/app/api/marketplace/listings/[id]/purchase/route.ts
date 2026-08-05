import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createCheckoutSession, isPaymongoConfigured } from "@/lib/paymongo";
import { splitAmount, installListing } from "@/lib/marketplace";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRateLimited(`marketplace-purchase:${session.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const listing = await prisma.marketplaceListing.findFirst({ where: { id, status: "PUBLISHED" } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (listing.creatorId === session.userId) {
    return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });
  }

  if (listing.priceCents === 0) {
    const existing = await prisma.marketplacePurchase.findFirst({
      where: { listingId: id, buyerId: session.userId, status: "PAID" },
    });
    if (existing?.installedProjectId) {
      return NextResponse.json({ installed: true, projectId: existing.installedProjectId });
    }

    const projectId = await installListing(id, session.userId);
    await prisma.marketplacePurchase.create({
      data: {
        listingId: id,
        buyerId: session.userId,
        amountCents: 0,
        platformFeeCents: 0,
        creatorEarningsCents: 0,
        status: "PAID",
        installedProjectId: projectId,
      },
    });
    return NextResponse.json({ installed: true, projectId });
  }

  if (!isPaymongoConfigured()) {
    return NextResponse.json({ error: "Payments aren't configured on this server." }, { status: 501 });
  }

  const { platformFeeCents, creatorEarningsCents } = splitAmount(listing.priceCents, listing.category);

  try {
    const checkoutSession = await createCheckoutSession({
      amount: listing.priceCents,
      description: listing.title,
      lineItemName: listing.title,
      successUrl: new URL(`/api/marketplace/purchases/return?listingId=${id}`, request.nextUrl.origin).toString(),
      cancelUrl: new URL(`/marketplace/${id}?canceled=1`, request.nextUrl.origin).toString(),
      metadata: { type: "marketplace_purchase", listingId: id, buyerId: session.userId },
    });

    await prisma.marketplacePurchase.create({
      data: {
        listingId: id,
        buyerId: session.userId,
        amountCents: listing.priceCents,
        platformFeeCents,
        creatorEarningsCents,
        paymongoCheckoutSessionId: checkoutSession.id,
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.attributes.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
