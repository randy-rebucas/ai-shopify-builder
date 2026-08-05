import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { settleMarketplacePurchase } from "@/lib/marketplace";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const listingId = request.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.redirect(new URL("/marketplace", request.nextUrl.origin));

  const purchase = await prisma.marketplacePurchase.findFirst({
    where: { listingId, buyerId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  if (purchase && purchase.status !== "PAID" && purchase.paymongoCheckoutSessionId) {
    // The webhook is the source of truth, but settle inline too so the redirect doesn't land the
    // buyer on a "still pending" page if the webhook hasn't been delivered yet.
    await settleMarketplacePurchase(purchase.paymongoCheckoutSessionId).catch(() => {});
  }

  const settled = await prisma.marketplacePurchase.findFirst({
    where: { listingId, buyerId: session.userId, status: "PAID" },
    orderBy: { createdAt: "desc" },
  });

  if (settled?.installedProjectId) {
    return NextResponse.redirect(new URL(`/projects/${settled.installedProjectId}`, request.nextUrl.origin));
  }

  return NextResponse.redirect(new URL(`/marketplace/${listingId}?pending=1`, request.nextUrl.origin));
}
