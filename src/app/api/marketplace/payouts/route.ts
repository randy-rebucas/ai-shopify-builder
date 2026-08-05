import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// No automated creator-payout rail exists (see the note on User.creatorBalanceCents) — this is a
// minimum so payouts get batched into fewer, worthwhile manual transfers rather than the operator
// having to process a ₱5 request.
const MIN_PAYOUT_CENTS = Number(process.env.MARKETPLACE_MIN_PAYOUT_CENTS ?? 50_000);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, payouts] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { creatorBalanceCents: true } }),
    prisma.creatorPayout.findMany({ where: { creatorId: session.userId }, orderBy: { requestedAt: "desc" } }),
  ]);

  return NextResponse.json({ balanceCents: user.creatorBalanceCents, minPayoutCents: MIN_PAYOUT_CENTS, payouts });
}

const bodySchema = z.object({ amountCents: z.number().int().positive().optional() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { creatorBalanceCents: true } });
  const amountCents = parsed.data.amountCents ?? user.creatorBalanceCents;

  if (amountCents < MIN_PAYOUT_CENTS) {
    return NextResponse.json({ error: `The minimum payout is ₱${(MIN_PAYOUT_CENTS / 100).toFixed(2)}.` }, { status: 400 });
  }
  if (amountCents > user.creatorBalanceCents) {
    return NextResponse.json({ error: "That's more than your available balance." }, { status: 400 });
  }

  const [payout] = await prisma.$transaction([
    prisma.creatorPayout.create({ data: { creatorId: session.userId, amountCents } }),
    prisma.user.update({ where: { id: session.userId }, data: { creatorBalanceCents: { decrement: amountCents } } }),
  ]);

  return NextResponse.json(payout, { status: 201 });
}
