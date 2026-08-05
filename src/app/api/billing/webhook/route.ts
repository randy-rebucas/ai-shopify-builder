import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { isBillablePlan } from "@/lib/plans";

const PLAN_DURATION_MS = 31 * 24 * 60 * 60 * 1000;

interface PaymongoEvent {
  data: {
    attributes: {
      type: string;
      data: {
        id: string;
        attributes: {
          metadata?: Record<string, string> | null;
          payment_intent?: { attributes: { status: string } } | null;
        };
      };
    };
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook isn't configured" }, { status: 501 });

  const verified = verifyWebhookSignature(rawBody, request.headers.get("paymongo-signature"), webhookSecret);
  if (!verified) return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });

  let event: PaymongoEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.data.attributes.type !== "checkout_session.payment.paid") {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.attributes.data;
  const metadata = checkoutSession.attributes.metadata;

  if (metadata?.type === "marketplace_purchase") {
    const { settleMarketplacePurchase } = await import("@/lib/marketplace");
    await settleMarketplacePurchase(checkoutSession.id);
    return NextResponse.json({ received: true });
  }

  const tier = metadata?.tier;
  const userId = metadata?.userId;
  if (!tier || !userId || !isBillablePlan(tier)) return NextResponse.json({ received: true });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paymongoCheckoutSessionId: true },
  });
  if (!user || user.paymongoCheckoutSessionId !== checkoutSession.id) return NextResponse.json({ received: true });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: tier, planExpiresAt: new Date(Date.now() + PLAN_DURATION_MS) },
  });

  return NextResponse.json({ received: true });
}
