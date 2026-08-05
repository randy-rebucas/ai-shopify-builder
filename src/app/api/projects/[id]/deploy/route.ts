import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { deployProject, isDeployConfigured } from "@/lib/deploy";
import { decryptSecret } from "@/lib/crypto";
import { fixFromError, type GeneratedFile, type GenerationPlan } from "@/lib/ai/generate";
import { isRateLimited } from "@/lib/rate-limit";
import { redactSecrets } from "@/lib/redact";
import { canDeploy } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

const MAX_AUTO_FIX_ATTEMPTS = 2;

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await prisma.deploymentConfig.findUnique({ where: { projectId: id } });
  return NextResponse.json({
    available: isDeployConfigured(),
    status: config?.deployStatus ?? "NONE",
    url: config?.deployedUrl ?? null,
    deployedAt: config?.deployedAt ?? null,
    error: config?.deployError ?? null,
  });
}

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each call spins up a real Fly deploy (and up to two AI auto-fix cycles) — expensive in both
  // compute and external API cost, so it gets its own limit rather than relying on generate's.
  if (isRateLimited(`deploy:${session.userId}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many deploy requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canDeploy(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  if (!isDeployConfigured()) {
    return NextResponse.json({ error: "Deploy automation isn't configured on this server." }, { status: 501 });
  }

  const latestApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!latestApp) {
    return NextResponse.json({ error: "Nothing has been generated yet." }, { status: 400 });
  }

  const existingConfig = await prisma.deploymentConfig.upsert({
    where: { projectId: id },
    create: { projectId: id, deployStatus: "DEPLOYING", deployError: null },
    update: { deployStatus: "DEPLOYING", deployError: null },
  });

  const deployAttemptRecord = await prisma.deployAttempt.create({ data: { projectId: id, status: "DEPLOYING" } });
  async function finishAttempt(data: { status: "DEPLOYED" | "FAILED"; url?: string; error?: string; autoFixLog: unknown }) {
    await prisma.deployAttempt.update({
      where: { id: deployAttemptRecord.id },
      data: { status: data.status, url: data.url, error: data.error, autoFixLog: data.autoFixLog as Prisma.InputJsonValue, finishedAt: new Date() },
    });
  }

  const extraSecrets: Record<string, string> = {};
  if (existingConfig.shopifyShopDomain && existingConfig.shopifyAdminAccessTokenCiphertext) {
    extraSecrets.SHOPIFY_STORE_DOMAIN = existingConfig.shopifyShopDomain;
    extraSecrets.SHOPIFY_ADMIN_ACCESS_TOKEN = decryptSecret(existingConfig.shopifyAdminAccessTokenCiphertext);
  }

  const plan = latestApp.plan as unknown as GenerationPlan;
  let files = latestApp.files as unknown as GeneratedFile[];
  const autoFixLog: { attempt: number; diagnosis: string }[] = [];

  for (let attempt = 1; attempt <= MAX_AUTO_FIX_ATTEMPTS; attempt++) {
    try {
      const result = await deployProject({
        projectId: id,
        projectName: project.name,
        files,
        extraSecrets,
      });

      await prisma.deploymentConfig.update({
        where: { projectId: id },
        data: {
          deployStatus: "DEPLOYED",
          deployedUrl: result.url,
          deployedAppName: result.appName,
          deployedAt: new Date(),
          deployError: null,
        },
      });

      await finishAttempt({ status: "DEPLOYED", url: result.url, autoFixLog });
      return NextResponse.json({ status: "DEPLOYED", url: result.url, autoFixed: autoFixLog.length > 0, autoFixLog });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Deploy failed";
      // Defense in depth: scrub any secret value that might have ended up in an error message
      // (e.g. from an external tool's own output) before it's stored or returned to the client.
      const message = redactSecrets(rawMessage, [
        ...Object.values(extraSecrets),
        process.env.FLY_API_TOKEN,
        process.env.FLY_POSTGRES_PASSWORD,
      ]);

      if (attempt >= MAX_AUTO_FIX_ATTEMPTS) {
        await prisma.deploymentConfig.update({
          where: { projectId: id },
          data: { deployStatus: "FAILED", deployError: message.slice(0, 2000) },
        });
        await finishAttempt({ status: "FAILED", error: message.slice(0, 2000), autoFixLog });
        return NextResponse.json({ error: message, autoFixLog }, { status: 500 });
      }

      // Try to have the AI diagnose and patch the failure, then retry the deploy once more.
      try {
        const fix = await fixFromError(plan, files, message, project.name);
        autoFixLog.push({ attempt, diagnosis: fix.diagnosis });
        if (!fix.changed) {
          // The AI couldn't attribute this to anything in the generated files — no point retrying.
          await prisma.deploymentConfig.update({
            where: { projectId: id },
            data: { deployStatus: "FAILED", deployError: message.slice(0, 2000) },
          });
          await finishAttempt({ status: "FAILED", error: message.slice(0, 2000), autoFixLog });
          return NextResponse.json({ error: message, autoFixLog }, { status: 500 });
        }
        files = fix.files;
        await prisma.generatedApp.create({
          data: {
            projectId: id,
            plan: plan as unknown as Prisma.InputJsonValue,
            files: files as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Auto-fix attempt itself failed (e.g. AI call errored) — report the original deploy error.
        await prisma.deploymentConfig.update({
          where: { projectId: id },
          data: { deployStatus: "FAILED", deployError: message.slice(0, 2000) },
        });
        await finishAttempt({ status: "FAILED", error: message.slice(0, 2000), autoFixLog });
        return NextResponse.json({ error: message, autoFixLog }, { status: 500 });
      }
    }
  }

  await finishAttempt({ status: "FAILED", error: "Deploy failed after auto-fix attempts.", autoFixLog });
  return NextResponse.json({ error: "Deploy failed after auto-fix attempts.", autoFixLog }, { status: 500 });
}
