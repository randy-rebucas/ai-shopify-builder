# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three overlapping audiences build with AI Shopify Builder:
- Solo/indie Shopify developers and small agency devs building custom apps for merchant clients who want to skip boilerplate.
- Non-technical Shopify merchants who want a custom app feature without hiring a developer.
- Small Shopify app agencies/teams shipping multiple apps for various clients who need speed at scale.

All arrive with the same job: describe a Shopify app or feature in plain English and get a working, installable app out the other end.

## Product Purpose

AI Shopify Builder turns a natural-language description of a Shopify app feature into a complete, running app: it plans the data model, generates the code, renders a live preview/workspace, and gets the result ready to deploy to a Shopify store or Partner account. Success is a merchant or developer going from an idea to an installed app without writing boilerplate by hand.

## Positioning

Unlike generic AI app builders (Bolt, v0, plain Shopify CLI scaffolding), every app it generates is Shopify-native from the first generation: Polaris UI, OAuth, and webhooks are wired up as part of the generation itself, not bolted on afterward. The mechanism is Shopify-specific scaffolding baked into the AI planning step, not a generic web-app generator pointed at Shopify docs.

## Operating Context

- Users sign up/log in, land on a dashboard, and describe an app idea in a prompt box to start a new project.
- Each project opens into a workspace (`src/app/projects/[id]/workspace.tsx`) with AI-driven generation, a live preview, and an embedded terminal for the generated app.
- Projects have a status (in progress, ready, etc., see `StatusBadge`) and are listed on the dashboard sorted by recent activity.
- Generation is powered by both Anthropic and OpenAI SDKs (`src/lib/ai/generate.ts`).
- Data is persisted via Prisma/Postgres; auth is session-based (`src/lib/auth`).

## Capabilities and Constraints

- Stack: Next.js 16, Tailwind CSS v4, Prisma 7 + Postgres, Zustand, TanStack Query, `@anthropic-ai/sdk`, `openai`.
- Generated Shopify apps must use Shopify's Polaris design system — this is a binding product requirement for generated app output, not only a marketing claim. Polaris governs the apps AI Shopify Builder produces; it does not dictate the visual language of AI Shopify Builder's own dashboard/marketing/workspace UI.
- Deploy path: apps are intended to ship to a Shopify store or Partner account (one-click deploy, per current marketing copy) — implementation status of actual deploy should be verified against code before being treated as fully shipped.
- Undecided: exact scope of "one-click deploy" (fully automated vs. guided), and how much of the Polaris requirement is currently enforced in generated output vs. aspirational.

## Brand Commitments

- Name: "AI Shopify Builder."
- Existing visual identity (marketing site, dashboard): black/white base, indigo (`#6366f1`) accent, rounded-full pills, soft shadows, generous whitespace — see `src/app/page.tsx` and `src/app/dashboard/page.tsx` for current expression.
- `Logo` / `LogoMark` components exist at `@/components/logo` and are the binding brand mark.

## Evidence on Hand

- No real customer testimonials, logos, or case studies currently in the codebase — none should be fabricated.
- Marketing copy claims ("Polaris UI included," "OAuth & webhooks wired up," "One-click deploy") exist in `src/app/page.tsx`; treat as product commitments to honor in future generation logic, not just page copy to preserve as-is.

## Product Principles

1. Every generated app is Shopify-native by default (Polaris, OAuth, webhooks) — never a generic app that happens to run on Shopify.
2. The path from prompt to running app must stay legible to non-technical merchants, not just developers.
3. The workspace (live preview + terminal) is where trust is built — generation should be visible and inspectable, not a black box.
4. Speed and low boilerplate are core value props for professional/agency users as much as ease is for merchants.
