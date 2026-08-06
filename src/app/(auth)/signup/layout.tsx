import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your AI Shopify Builder account and start building Shopify apps with AI in minutes.",
  alternates: { canonical: "/signup" },
  openGraph: { title: "Sign up · AI Shopify Builder", url: "/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
