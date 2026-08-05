import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isBillablePlan } from "@/lib/plans";
import { getCheckoutSession } from "@/lib/paymongo";

const PLAN_DURATION_MS = 31 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { paymongoCheckoutSessionId: true },
  });
  if (!user?.paymongoCheckoutSessionId) {
    return NextResponse.redirect(new URL("/pricing?error=missing_checkout", request.nextUrl.origin));
  }

  try {
    const checkoutSession = await getCheckoutSession(user.paymongoCheckoutSessionId);
    const paid = checkoutSession.attributes.payment_intent?.attributes.status === "succeeded";
    const tier = checkoutSession.attributes.metadata?.tier;

    if (paid && tier && isBillablePlan(tier)) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { plan: tier, planExpiresAt: new Date(Date.now() + PLAN_DURATION_MS) },
      });
      return NextResponse.redirect(new URL("/account?upgraded=1", request.nextUrl.origin));
    }

    return NextResponse.redirect(new URL("/account?pending=1", request.nextUrl.origin));
  } catch {
    return NextResponse.redirect(new URL("/pricing?error=checkout_check_failed", request.nextUrl.origin));
  }
}
