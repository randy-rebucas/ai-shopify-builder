import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { verifyToken, ensureRepo } from "@/lib/github";

const bodySchema = z.object({
  token: z.string().min(1),
  repoName: z.string().optional(),
});

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { token, repoName } = parsed.data;

  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "That GitHub token isn't valid, or is missing the required scope." }, { status: 400 });
  }

  let repo;
  try {
    repo = await ensureRepo(token, user.login, repoName || project.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create or find the GitHub repository.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      githubTokenCiphertext: encryptSecret(token),
      githubRepoFullName: repo.fullName,
      githubRepoUrl: repo.htmlUrl,
      githubConnectedAt: new Date(),
    },
  });

  return NextResponse.json({
    repoFullName: updated.githubRepoFullName,
    repoUrl: updated.githubRepoUrl,
    connectedAt: updated.githubConnectedAt,
  });
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.update({
    where: { id },
    data: {
      githubTokenCiphertext: null,
      githubRepoFullName: null,
      githubRepoUrl: null,
      githubConnectedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
