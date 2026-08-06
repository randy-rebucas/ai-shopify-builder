import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/logo";
import type { BillablePlan } from "@/lib/plans";
import { UpgradeButton } from "./upgrade-button";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for AI Shopify Builder. Start free, then upgrade for more projects, stores, and AI credits.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · AI Shopify Builder",
    description:
      "Simple, transparent pricing for AI Shopify Builder. Start free, then upgrade for more projects, stores, and AI credits.",
    url: "/pricing",
  },
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 5 5 9-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Tier {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  featured?: boolean;
  billTier?: BillablePlan;
  cta: { label: string; href: string; disabled?: boolean };
  included: string[];
  excluded?: string[];
}

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "Explore the platform and build your first prototype.",
    cta: { label: "Get started free", href: "/signup" },
    included: [
      "1 Project",
      "1 Shopify Store Connection",
      "50 AI Credits/month",
      "Basic AI Chat Assistant",
      "Live Preview",
      "Local Testing",
      "Community Templates",
      "Community Support",
    ],
    excluded: ["Cloud Deployment", "Team Collaboration", "Marketplace Publishing", "Premium AI Models"],
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    tagline: "Everything you need to build your first production app.",
    billTier: "STARTER",
    cta: { label: "Upgrade to Starter", href: "/pricing" },
    included: [
      "5 Projects",
      "2 Shopify Stores",
      "1,000 AI Credits/month",
      "AI Feature Generator & Code Assistant",
      "Theme Extension, Admin UI & Database Builders",
      "One-Click Deployment",
      "Version History",
      "AI Debugger & Build History",
      "Email Support",
    ],
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    tagline: "Everything in Starter, plus unlimited projects.",
    featured: true,
    billTier: "PROFESSIONAL",
    cta: { label: "Upgrade to Professional", href: "/pricing" },
    included: [
      "Unlimited Projects",
      "10 Shopify Stores",
      "5,000 AI Credits/month",
      "AI Planning, Refactoring & Architecture Assistant",
      "Shopify Functions, Checkout & POS Extensions",
      "Automated Testing & Performance Analysis",
      "GitHub Integration & Marketplace Publishing",
      "Up to 5 Team Members",
      "Priority Support",
    ],
  },
  {
    name: "Agency",
    price: "$249",
    period: "/month",
    tagline: "Everything in Professional, for multi-client teams.",
    billTier: "AGENCY",
    cta: { label: "Upgrade to Agency", href: "/pricing" },
    included: [
      "Unlimited Projects, Stores & Team Members",
      "20,000 AI Credits/month + Priority AI Queue",
      "White-label Client Portal & Workspaces",
      "Team Permissions & Activity Logs",
      "Private Marketplace & Custom Templates",
      "API Access & Custom Integrations",
      "Advanced Analytics & Usage Reports",
      "Dedicated Support",
    ],
  },
  {
    name: "Enterprise",
    price: "$999",
    period: "+/month",
    tagline: "Everything in Agency, for large organizations.",
    cta: { label: "Contact sales", href: "mailto:sales@aishopifybuilder.com", disabled: true },
    included: [
      "Unlimited AI Credits & Dedicated AI Models",
      "Private Cloud Deployment & High Availability",
      "Enterprise Security, SSO (SAML/OIDC) & Audit Logs",
      "Custom Integrations & Enterprise APIs",
      "SLA Guarantee & Dedicated Account Manager",
      "Personalized Onboarding & Team Training",
      "Premium Support",
    ],
  },
];

export default async function PricingPage() {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href={session ? "/dashboard" : "/"}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
            >
              Back to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center sm:pt-16">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing that scales with you</h1>
          <p className="mt-3 text-black/60">
            Flexible pricing designed for Shopify merchants, developers, agencies, and enterprise teams.
            Start for free and scale as your business grows.
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-24 sm:px-6 lg:grid-cols-5">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.featured ? "border-black/80 shadow-lg" : "border-black/10"
              }`}
            >
              {tier.featured && (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#6366f1]/10 px-2.5 py-1 text-xs font-medium text-[#6366f1]">
                  ⭐ Most Popular
                </span>
              )}
              <h2 className="text-lg font-semibold tracking-tight">{tier.name}</h2>
              <p className="mt-1 text-sm text-black/50">{tier.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                {tier.period && <span className="text-sm text-black/50">{tier.period}</span>}
              </div>

              {tier.billTier ? (
                <UpgradeButton
                  tier={tier.billTier}
                  label={tier.cta.label}
                  loggedIn={!!session}
                  featured={tier.featured}
                />
              ) : (
                <Link
                  href={tier.cta.href}
                  aria-disabled={tier.cta.disabled}
                  className={`mt-5 inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] ${
                    tier.cta.disabled
                      ? "pointer-events-none cursor-not-allowed border border-black/10 text-black/40"
                      : "bg-black text-white hover:bg-black/85"
                  }`}
                >
                  {tier.cta.label}
                </Link>
              )}

              <ul className="mt-6 flex flex-col gap-2.5 text-sm">
                {tier.included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-black/75">
                    <span className="mt-0.5 text-[#6366f1]">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
                {tier.excluded?.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-black/35">
                    <span className="mt-0.5">
                      <XIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
          <p className="text-sm text-black/50">
            Need more AI generation? Additional credit packs and add-ons are available once you upgrade.
            No credit card required to start on the Free plan.
          </p>
        </div>
      </main>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-black/45 sm:px-6">
          <Logo withWordmark={false} className="h-6 w-6" />
          <span>© {new Date().getFullYear()} AI Shopify Builder</span>
        </div>
      </footer>
    </div>
  );
}
