import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your AI Shopify Builder account to continue building your Shopify app.",
  alternates: { canonical: "/login" },
  openGraph: { title: "Log in · AI Shopify Builder", url: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
