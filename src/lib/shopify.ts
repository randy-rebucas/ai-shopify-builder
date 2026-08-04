const API_VERSION = "2025-01";

export function normalizeShopDomain(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return trimmed.includes(".") ? trimmed : `${trimmed}.myshopify.com`;
}

export interface ShopInfo {
  shopName: string;
  scopes: string[];
}

/**
 * Confirms an Admin API access token actually works against the given store, and reports the
 * access scopes it was granted — so we can warn if it's missing scopes the generated app needs.
 */
export async function verifyAdminAccessToken(shopDomain: string, accessToken: string): Promise<ShopInfo> {
  const headers = { "X-Shopify-Access-Token": accessToken };

  const shopRes = await fetch(`https://${shopDomain}/admin/api/${API_VERSION}/shop.json`, { headers });
  if (!shopRes.ok) {
    if (shopRes.status === 401 || shopRes.status === 403) {
      throw new Error("Shopify rejected this access token — check that it was copied correctly and hasn't been revoked.");
    }
    if (shopRes.status === 404) {
      throw new Error(`Couldn't reach ${shopDomain} — check the store domain.`);
    }
    throw new Error(`Shopify returned an unexpected error (${shopRes.status}) while verifying the token.`);
  }
  const shopJson = (await shopRes.json()) as { shop?: { name?: string } };

  const scopesRes = await fetch(`https://${shopDomain}/admin/oauth/access_scopes.json`, { headers });
  let scopes: string[] = [];
  if (scopesRes.ok) {
    const scopesJson = (await scopesRes.json()) as { access_scopes?: { handle: string }[] };
    scopes = (scopesJson.access_scopes ?? []).map((s) => s.handle);
  }

  return { shopName: shopJson.shop?.name ?? shopDomain, scopes };
}
