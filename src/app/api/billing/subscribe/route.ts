import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { BILLABLE_PLANS, isBillablePlan, paymongoAmountFor, PLAN_LIMITS } from "@/lib/plans";
import { createCheckoutSession, isPaymongoConfigured } from "@/lib/paymongo";

const bodySchema = z.object({ tier: z.enum(BILLABLE_PLANS) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPaymongoConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured on this server." }, { status: 501 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !isBillablePlan(parsed.data.tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const tier = parsed.data.tier;

  try {
    const checkoutSession = await createCheckoutSession({
      amount: paymongoAmountFor(tier),
      description: `${PLAN_LIMITS[tier].label} plan — 1 month`,
      lineItemName: `${PLAN_LIMITS[tier].label} plan (monthly)`,
      successUrl: new URL("/api/billing/return", request.nextUrl.origin).toString(),
      cancelUrl: new URL("/pricing?canceled=1", request.nextUrl.origin).toString(),
      metadata: { type: "plan_subscription", userId: session.userId, tier },
    });

    await prisma.user.update({
      where: { id: session.userId },
      data: { paymongoCheckoutSessionId: checkoutSession.id },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.attributes.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
