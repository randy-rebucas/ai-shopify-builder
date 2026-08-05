import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priceCents: true,
      status: true,
      createdAt: true,
      creatorId: true,
      creator: { select: { name: true, email: true } },
      files: true,
    },
  });
  if (!listing || (listing.status !== "PUBLISHED" && listing.creatorId !== session.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileCount = Array.isArray(listing.files) ? listing.files.length : 0;

  return NextResponse.json({ ...listing, files: undefined, fileCount, isOwner: listing.creatorId === session.userId });
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const listing = await prisma.marketplaceListing.findFirst({ where: { id, creatorId: session.userId } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.marketplaceListing.update({ where: { id }, data: { status: "UNLISTED" } });

  return NextResponse.json({ ok: true });
}
