export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export const siteName = "AI Shopify Builder";

export const defaultDescription =
  "Describe the Shopify app feature you want in plain English — AI plans, generates, and previews the code for you.";

export const noIndex = { index: false, follow: false } as const;
