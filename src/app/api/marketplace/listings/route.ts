import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canPublishToMarketplace } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

const LISTING_CATEGORIES = ["TEMPLATE", "COMPONENT", "EXTENSION", "COMPLETE_APP", "PROMPT_PACK"] as const;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = request.nextUrl.searchParams.get("category");
  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "PUBLISHED",
      ...(category && (LISTING_CATEGORIES as readonly string[]).includes(category) ? { category: category as (typeof LISTING_CATEGORIES)[number] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priceCents: true,
      createdAt: true,
      creator: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(listings);
}

const bodySchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  category: z.enum(LISTING_CATEGORIES),
  priceCents: z.number().int().min(0).max(10_000_000),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eligibility = await canPublishToMarketplace(session.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await findAccessibleProject(session.userId, parsed.data.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const latestApp = await prisma.generatedApp.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } });
  if (!latestApp) return NextResponse.json({ error: "Generate the app before publishing it." }, { status: 400 });

  const listing = await prisma.marketplaceListing.create({
    data: {
      creatorId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priceCents: parsed.data.priceCents,
      plan: latestApp.plan as Prisma.InputJsonValue,
      files: latestApp.files as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(listing, { status: 201 });
}
