import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireProject(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } });
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await requireProject(id, session.userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.chatMessage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

const bodySchema = z.object({ content: z.string().min(1) });

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await requireProject(id, session.userId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userMessage = await prisma.chatMessage.create({
    data: { projectId: id, role: "USER", content: parsed.data.content },
  });

  return NextResponse.json(userMessage, { status: 201 });
}
