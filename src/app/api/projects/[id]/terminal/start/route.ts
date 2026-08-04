import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { startSession } from "@/lib/terminal";
import type { GeneratedFile } from "@/lib/ai/generate";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const latestApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!latestApp) {
    return NextResponse.json({ error: "Nothing has been generated yet." }, { status: 400 });
  }

  try {
    await startSession(id, latestApp.files as unknown as GeneratedFile[]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start terminal session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
