import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stopSession } from "@/lib/terminal";
import { findAccessibleProject } from "@/lib/project-access";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await stopSession(id);
  return NextResponse.json({ ok: true });
}
