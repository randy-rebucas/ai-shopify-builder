import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

const PLAN_TIERS = ["FREE", "STARTER", "PROFESSIONAL", "AGENCY", "ENTERPRISE"] as const;

const bodySchema = z.object({
  plan: z.enum(PLAN_TIERS).optional(),
  aiCreditsUsed: z.number().int().min(0).optional(),
  planExpiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdminEmail(session.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { plan, aiCreditsUsed, planExpiresAt } = parsed.data;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(plan !== undefined && { plan }),
        ...(aiCreditsUsed !== undefined && { aiCreditsUsed }),
        ...(planExpiresAt !== undefined && { planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null }),
      },
      select: { id: true, plan: true, aiCreditsUsed: true, planExpiresAt: true },
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
