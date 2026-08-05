import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { pushFiles } from "@/lib/github";
import type { GeneratedFile } from "@/lib/ai/generate";
import { canUseGithubIntegration } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canUseGithubIntegration(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  if (!project.githubTokenCiphertext || !project.githubRepoFullName) {
    return NextResponse.json({ error: "Connect a GitHub repository first." }, { status: 400 });
  }

  const latestApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!latestApp) {
    return NextResponse.json({ error: "Nothing has been generated yet." }, { status: 400 });
  }

  const token = decryptSecret(project.githubTokenCiphertext);
  const files = latestApp.files as unknown as GeneratedFile[];

  try {
    const { pushed } = await pushFiles(token, project.githubRepoFullName, files, `Update from AI Shopify Builder: ${project.name}`);
    return NextResponse.json({ pushed, repoUrl: project.githubRepoUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to push to GitHub.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
