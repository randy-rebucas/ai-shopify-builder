# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # start dev server (also runs build:preview-frame + prisma generate first)
npm run build             # production build (also runs build:preview-frame + prisma generate first)
npm run start              # run production build
npm run lint                # eslint
```

There is no configured test runner/test script in `package.json` — check with the user before assuming a test framework.

`prisma generate` outputs the client to `src/generated/prisma` (not the default `node_modules/.prisma`), so imports use `@/generated/prisma`-style paths, not `@prisma/client` directly. Run `npx prisma migrate dev` / `npx prisma db push` as needed against `prisma/schema.prisma`.

## Architecture

This app **is** an AI-powered generator/builder for small Shopify Remix apps — it is not itself a Shopify app, and it does not contain a checked-out template project. Generated apps only ever exist as JSON (`plan` + `files`) stored in the database; there is no on-disk scaffold to browse.

### Generation pipeline (`src/lib/ai/`)

1. **Plan** — `generate.ts`'s `PLANNING_SYSTEM_PROMPT` turns a natural-language request into a JSON plan (`summary`, `features`, `dataModels`, `shopifyApis`, `files[]`).
2. **Codegen** — `CODEGEN_SYSTEM_PROMPT` turns the plan into a small set of feature-slice files (plain JS/JSX, not TS) meant to slot into a fixed Shopify Remix scaffold (`app/routes/app.*.jsx`, Polaris UI, `authenticate.admin(request)`, Prisma via `db.server.js`). The LLM only produces the feature slice — boilerplate (README, `shopify.app.toml`, `package.json`, `shopify.server.js`, etc.) is described in the prompt, not generated file-by-file.
3. **Revision** — `PLAN_REVISION_SYSTEM_PROMPT` / `FILES_REVISION_SYSTEM_PROMPT` support incremental follow-up edits (patch, not full regeneration).
4. **Providers** — `src/lib/ai/providers/claude.ts` and `providers/openai.ts` are pluggable LLM backends behind `providers/index.ts`/`types.ts`.

Generated file paths are sanitized/filtered via `src/lib/generated-file-path.ts` (`filterSafeGeneratedFiles`) before being used anywhere, notably by deploy.

### Deployment (`src/lib/deploy.ts`)

Deploys shell out to `flyctl` (Fly.io), not a local Docker daemon:
1. Materializes a project's generated files into a temp dir.
2. Writes a two-stage `Dockerfile` and a generated `fly.toml`.
3. Creates/reuses a Fly.io app and a per-project Postgres DB on the shared Fly Postgres cluster.
4. Sets secrets (`DATABASE_URL`, etc.) via `flyctl secrets set`.
5. Runs `flyctl deploy --remote-only --yes` (remote build on Fly's builders).

Gated by `isDeployConfigured()`, which requires `FLY_API_TOKEN`, `FLY_ORG`, `FLY_POSTGRES_HOST`, `FLY_POSTGRES_PASSWORD`, `FLY_POSTGRES_APP` (optional: `FLY_REGION` default `iad`, `FLYCTL_PATH` default `flyctl`). Each attempt is logged as a `DeployAttempt`.

### Data model (`prisma/schema.prisma`)

- `User` → `Project` (1:many). `User` also carries plan/credits, Paymongo billing fields, and marketplace earnings.
- `Project` → `ChatMessage[]` (conversation history), `GeneratedApp[]` (plan/files JSON snapshots), `DeployAttempt[]`, one `DeploymentConfig` (Shopify Partner/hosting/shop-install credentials — stored as ciphertext).
- `TeamMember` implements seat-based team sharing off a paying owner account.
- Marketplace: `MarketplaceListing` (published plan/files snapshot) ← `MarketplacePurchase` ← `User`, plus `CreatorPayout` for manual (non-automated) payout settlement.

### Auth (`src/lib/auth.ts`)

Custom cookie/JWT auth, not a third-party auth provider: `bcryptjs` for password hashing, `jose` for HS256 JWTs. Purpose-scoped subkeys are derived from `AUTH_SECRET` via `deriveKey()` (`src/lib/derive-key.ts`) — session cookies and OAuth-state tokens use different derived keys. Sessions live in an httpOnly `session` cookie (7-day expiry), read via `getSession()`.

### Layout

- `src/app/` — Next.js App Router routes: `(auth)`, `account`, `api`, `dashboard`, `marketplace`, `pricing`, `projects`, `team`.
- `src/lib/` — business logic, flat except `ai/`: `db.ts`, `deploy.ts`, `shopify.ts`, `github.ts`, `paymongo.ts`, `crypto.ts`/`derive-key.ts`, `plans.ts`, `usage.ts`, `rate-limit.ts`, `marketplace.ts`, `project-access.ts`.
- `src/components/` — shared UI (`logo.tsx`, `user-menu.tsx`, `projects-panel.tsx`, `code-highlight.tsx`, `status-badge.tsx`).
