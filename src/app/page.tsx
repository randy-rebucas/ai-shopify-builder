import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Logo, LogoMark } from "@/components/logo";
import { siteUrl, siteName, defaultDescription } from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  description: defaultDescription,
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "0",
    highPrice: "99",
    priceCurrency: "USD",
    offerCount: "3",
  },
};

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 5 5 9-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const features = [
  {
    icon: SparkleIcon,
    title: "Describe it, get it built",
    description:
      "Tell the AI what your app should do in plain English. It plans the data model, UI, and Shopify integrations for you.",
  },
  {
    icon: BoltIcon,
    title: "Production-ready code",
    description:
      "Every generated app follows Shopify's app standards — Polaris UI, webhooks, and OAuth wired up from the start.",
  },
  {
    icon: ShieldIcon,
    title: "Deploy with confidence",
    description:
      "Preview changes in a live sandbox, then ship straight to your Shopify Partner account when you're ready.",
  },
];

const steps = [
  { title: "Describe your app", description: "Write a short prompt describing the feature or app you want." },
  { title: "AI plans & builds", description: "Watch it generate the schema, endpoints, and Polaris UI in real time." },
  { title: "Deploy to Shopify", description: "Push your app live to your store or Partner account in one click." },
];

const pricingTeaser = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "Explore the platform and build your first prototype.",
    features: ["1 Project", "1 Shopify Store", "50 AI Credits/month", "Community Support"],
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    tagline: "Everything to build your first production app.",
    features: ["5 Projects", "2 Shopify Stores", "1,000 AI Credits/month", "One-Click Deployment"],
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    tagline: "For growing agencies and Shopify app partners.",
    featured: true,
    features: ["Unlimited Projects", "10 Shopify Stores", "5,000 AI Credits/month", "Up to 5 Team Members"],
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            Pricing
          </Link>
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
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(closest-side, #6366f1, transparent)" }}
          />

          <div className="animate-hero-in relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Build Shopify apps using natural language.
            </h1>
            <p className="max-w-lg text-base text-black/60 sm:text-lg">
              Describe the feature you want and AI plans, generates, and deploys a complete Shopify
              app — no boilerplate required.
            </p>
            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-medium transition hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
              >
                Log in
              </Link>
            </div>
            <p className="mt-1 text-xs text-black/65">No credit card required · Deploy your first app in minutes</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="border-t border-black/10">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="grid gap-3 border-b border-black/10 py-8 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-baseline sm:gap-8 sm:py-10"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-black/70">
                    <Icon />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                </div>
                <p className="max-w-md text-black/60">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-black/10 bg-black/[0.015]">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">From idea to installed app</h2>
              <p className="mt-2 text-sm text-black/60 sm:text-base">Three steps, no Shopify CLI required.</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                  <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-medium text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-black/60">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simple, transparent pricing</h2>
            <p className="mt-2 text-sm text-black/60 sm:text-base">
              Start for free. Upgrade when you&rsquo;re ready to ship to production.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {pricingTeaser.map((tier) => (
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
                <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
                <p className="mt-1 text-sm text-black/50">{tier.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                  <span className="text-sm text-black/50">{tier.period}</span>
                </div>
                <ul className="mt-5 flex flex-col gap-2 text-sm">
                  {tier.features.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-black/75">
                      <span className="mt-0.5 text-[#6366f1]">
                        <CheckIcon />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`mt-6 inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] ${
                    tier.featured
                      ? "bg-black text-white hover:bg-black/85"
                      : "border border-black/10 hover:bg-black/[0.03]"
                  }`}
                >
                  {tier.name === "Free" ? "Get started free" : `Choose ${tier.name}`}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-black/50">
            Need more? Agency and Enterprise plans are available too.{" "}
            <Link href="/pricing" className="font-medium text-black underline hover:no-underline">
              See full pricing
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <ul className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-black/60">
            {["Polaris UI included", "OAuth & webhooks wired up", "One-click deploy"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="text-[#6366f1]">
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to build your first app?</h2>
          <p className="mt-2 text-black/60">Join builders shipping Shopify apps faster with AI.</p>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            Get started free
          </Link>
        </section>
      </main>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-black/65 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            <span>AI Shopify Builder</span>
          </div>
          <p>© {new Date().getFullYear()} AI Shopify Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
