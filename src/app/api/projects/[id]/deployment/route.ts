import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { findAccessibleProject } from "@/lib/project-access";

const HOSTING_PROVIDERS = ["FLY", "RENDER", "RAILWAY", "HEROKU", "VM"] as const;

const bodySchema = z.object({
  appVersion: z.string().min(1).optional(),
  shopifyPartnerToken: z.string().optional(),
  shopifyOrgId: z.string().optional(),
  hostingProvider: z.enum(HOSTING_PROVIDERS).nullable().optional(),
  hostingToken: z.string().optional(),
  hostingConfig: z.record(z.string(), z.string()).optional(),
});

function toStatus(config: {
  appVersion: string;
  shopifyOrgId: string | null;
  shopifyPartnerTokenCiphertext: string | null;
  hostingProvider: string | null;
  hostingTokenCiphertext: string | null;
  hostingConfig: unknown;
  updatedAt: Date;
} | null) {
  if (!config) {
    return {
      appVersion: "0.1.0",
      shopifyOrgId: null,
      hasShopifyPartnerToken: false,
      hostingProvider: null,
      hasHostingToken: false,
      hostingConfig: null,
      updatedAt: null,
    };
  }
  return {
    appVersion: config.appVersion,
    shopifyOrgId: config.shopifyOrgId,
    hasShopifyPartnerToken: !!config.shopifyPartnerTokenCiphertext,
    hostingProvider: config.hostingProvider,
    hasHostingToken: !!config.hostingTokenCiphertext,
    hostingConfig: config.hostingConfig ?? null,
    updatedAt: config.updatedAt,
  };
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await prisma.deploymentConfig.findUnique({ where: { projectId: id } });
  return NextResponse.json(toStatus(config));
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { appVersion, shopifyPartnerToken, shopifyOrgId, hostingProvider, hostingToken, hostingConfig } = parsed.data;

  const config = await prisma.deploymentConfig.upsert({
    where: { projectId: id },
    create: {
      projectId: id,
      appVersion: appVersion ?? "0.1.0",
      shopifyOrgId,
      shopifyPartnerTokenCiphertext: shopifyPartnerToken ? encryptSecret(shopifyPartnerToken) : undefined,
      hostingProvider: hostingProvider ?? undefined,
      hostingTokenCiphertext: hostingToken ? encryptSecret(hostingToken) : undefined,
      hostingConfig,
    },
    update: {
      ...(appVersion !== undefined ? { appVersion } : {}),
      ...(shopifyOrgId !== undefined ? { shopifyOrgId } : {}),
      ...(shopifyPartnerToken ? { shopifyPartnerTokenCiphertext: encryptSecret(shopifyPartnerToken) } : {}),
      ...(hostingProvider !== undefined ? { hostingProvider } : {}),
      ...(hostingToken ? { hostingTokenCiphertext: encryptSecret(hostingToken) } : {}),
      ...(hostingConfig !== undefined ? { hostingConfig } : {}),
    },
  });

  return NextResponse.json(toStatus(config));
}
