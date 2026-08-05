import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { normalizeShopDomain, verifyAdminAccessToken } from "@/lib/shopify";
import { setAppSecrets } from "@/lib/deploy";
import { redactSecrets } from "@/lib/redact";
import { canConnectStore } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

const bodySchema = z.object({
  shopDomain: z.string().min(1),
  adminAccessToken: z.string().min(1),
});

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await prisma.deploymentConfig.findUnique({ where: { projectId: id } });
  return NextResponse.json({
    status: config?.installStatus ?? "NONE",
    shopDomain: config?.shopifyShopDomain ?? null,
    grantedScopes: config?.shopifyGrantedScopes ?? null,
    installedAt: config?.installedAt ?? null,
    error: config?.installError ?? null,
  });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const existingForProject = await prisma.deploymentConfig.findUnique({ where: { projectId: id } });
  if (existingForProject?.installStatus !== "INSTALLED") {
    const eligibility = await canConnectStore(project.userId);
    if (!eligibility.allowed) {
      return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
    }
  }

  const shopDomain = normalizeShopDomain(parsed.data.shopDomain);
  const adminAccessToken = parsed.data.adminAccessToken.trim();

  try {
    const shopInfo = await verifyAdminAccessToken(shopDomain, adminAccessToken);

    const config = await prisma.deploymentConfig.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        shopifyShopDomain: shopDomain,
        shopifyAdminAccessTokenCiphertext: encryptSecret(adminAccessToken),
        shopifyGrantedScopes: shopInfo.scopes.join(","),
        installStatus: "INSTALLED",
        installedAt: new Date(),
        installError: null,
      },
      update: {
        shopifyShopDomain: shopDomain,
        shopifyAdminAccessTokenCiphertext: encryptSecret(adminAccessToken),
        shopifyGrantedScopes: shopInfo.scopes.join(","),
        installStatus: "INSTALLED",
        installedAt: new Date(),
        installError: null,
      },
    });

    // If this project has already been deployed, push the token to the running app too, so it
    // starts talking to the store immediately instead of waiting for the next deploy.
    if (config.deployedAppName) {
      try {
        await setAppSecrets(config.deployedAppName, {
          SHOPIFY_STORE_DOMAIN: shopDomain,
          SHOPIFY_ADMIN_ACCESS_TOKEN: adminAccessToken,
        });
      } catch (secretError) {
        const rawMessage =
          secretError instanceof Error ? secretError.message : "Failed to push secrets to the deployed app";
        const message = redactSecrets(rawMessage, [adminAccessToken]);
        return NextResponse.json({
          status: "INSTALLED",
          shopDomain,
          shopName: shopInfo.shopName,
          grantedScopes: shopInfo.scopes,
          warning: `Token saved, but couldn't push it to the deployed app: ${message}. Redeploy to pick it up.`,
        });
      }
    }

    return NextResponse.json({
      status: "INSTALLED",
      shopDomain,
      shopName: shopInfo.shopName,
      grantedScopes: shopInfo.scopes,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Failed to verify the Shopify access token";
    const message = redactSecrets(rawMessage, [adminAccessToken]);
    await prisma.deploymentConfig.upsert({
      where: { projectId: id },
      create: { projectId: id, installStatus: "FAILED", installError: message.slice(0, 2000) },
      update: { installStatus: "FAILED", installError: message.slice(0, 2000) },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
