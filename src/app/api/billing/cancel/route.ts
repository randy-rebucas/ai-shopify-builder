import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PayMongo checkout sessions are one-off payments, not an auto-renewing subscription — there's
// nothing to cancel on PayMongo's side. "Cancelling" here just opts the user out of their paid
// plan immediately instead of waiting for it to lapse at planExpiresAt.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { plan: true } });
  if (!user || user.plan === "FREE") {
    return NextResponse.json({ error: "You're already on the Free plan." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { plan: "FREE", planExpiresAt: null },
  });

  return NextResponse.json({ ok: true });
}
