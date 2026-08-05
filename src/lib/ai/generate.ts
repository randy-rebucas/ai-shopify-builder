import { getAIProvider } from "./index";
import type { ChatMessageInput } from "./types";

const PLANNING_SYSTEM_PROMPT = `You are the Solution Architect for AI Shopify Builder, a platform that turns natural-language
descriptions into Shopify apps. Given a user's request, produce a concise JSON implementation plan.

Respond with ONLY valid JSON matching this shape:
{
  "summary": string,
  "features": string[],
  "dataModels": { "name": string, "fields": string[] }[],
  "shopifyApis": string[],
  "files": { "path": string, "purpose": string }[]
}

Keep the plan small and buildable — this is a v1 vertical slice, not the full app.`;

const CODEGEN_SYSTEM_PROMPT = `You are the Backend + Frontend Engineer for AI Shopify Builder. Given an implementation plan
(JSON) for a small Shopify app feature, generate the actual source files.

This runs inside a standard Shopify Remix app scaffold for a PRIVATE/custom app installed directly from the
merchant's store admin (a static Admin API access token, not OAuth) — do not generate any of these, they're
added automatically: README.md, DEPLOYMENT.md, shopify.app.toml, package.json, .env.example, vite.config.js,
app/root.jsx, app/entry.server.jsx, app/shopify.server.js (exports "authenticate", which exposes
authenticate.admin(request) -> { admin, session }, backed by the store's static Admin API token — no OAuth,
no login route needed), app/db.server.js (default-exports a Prisma client instance).

Available dependencies you can import from: @remix-run/node, @remix-run/react, @shopify/polaris, @prisma/client
(via "../db.server" or "../../db.server"), react, react-dom. Admin UI routes should live under
app/routes/app.*.jsx, wrap content with Polaris components, and call authenticate.admin(request)
(from "../shopify.server") in their loader/action, then use admin.graphql(query, options) for Admin API calls.

If you write prisma/schema.prisma, include ONLY "model"/"enum" blocks — never a "generator" or "datasource" block,
those are managed automatically and always target PostgreSQL.

Respond with ONLY valid JSON matching this shape:
{
  "files": { "path": string, "content": string }[]
}

Generate real, runnable JavaScript/JSX/Liquid code — no placeholders, no TypeScript syntax (this scaffold is plain
JS). Keep it small: 3-6 files max for this v1 slice.`;

const PLAN_REVISION_SYSTEM_PROMPT = `You are the Solution Architect for AI Shopify Builder, revising an existing
implementation plan for a Shopify app based on a user's follow-up request.

You will receive JSON: { "currentPlan": <existing plan>, "changeRequest": string }.

Respond with ONLY valid JSON for the FULL UPDATED plan, in the same shape as the current plan:
{
  "summary": string,
  "features": string[],
  "dataModels": { "name": string, "fields": string[] }[],
  "shopifyApis": string[],
  "files": { "path": string, "purpose": string }[]
}

Keep everything from the current plan that the change request doesn't affect — this is a revision,
not a rewrite. Only add, remove, or modify what the change request implies. Keep the plan small and buildable.`;

const FILES_REVISION_SYSTEM_PROMPT = `You are the Backend + Frontend Engineer for AI Shopify Builder, revising an
existing Shopify app codebase based on a user's follow-up request.

This runs inside a standard Shopify Remix app scaffold for a PRIVATE/custom app (static Admin API token, no OAuth)
that already exists and is not shown to you — never generate or reference changes to: README.md, DEPLOYMENT.md,
shopify.app.toml, package.json, .env.example, vite.config.js, app/root.jsx, app/entry.server.jsx,
app/shopify.server.js, app/db.server.js.
Available dependencies: @remix-run/node, @remix-run/react, @shopify/polaris, @prisma/client (via "../db.server"),
react, react-dom.
If you write prisma/schema.prisma, include ONLY "model"/"enum" blocks — never "generator"/"datasource".

You will receive JSON: { "plan": <updated plan>, "currentFiles": <existing feature files as {path, content}>, "changeRequest": string }.

Respond with ONLY valid JSON:
{
  "files": { "path": string, "content": string }[],
  "removedFiles": string[]
}

"files" should only include files that are NEW or need to CHANGE because of the request — omit every file that
doesn't need to change. "removedFiles" should list the paths of any existing files that the request makes obsolete
(e.g. replaced by a different approach, or an explicit removal request) — omit it or leave it empty if nothing
should be removed. Generate real, runnable JavaScript/JSX/Liquid code — no placeholders, no TypeScript syntax.`;

const FIX_SYSTEM_PROMPT = `You are the on-call Engineer for AI Shopify Builder, debugging a Shopify app that just failed to
build or deploy. You're given the failing files and the raw build/deploy error log.

This runs inside a standard Shopify Remix app scaffold for a PRIVATE/custom app (static Admin API token, no OAuth)
that already exists and is not shown to you — never generate or reference changes to: README.md, DEPLOYMENT.md,
shopify.app.toml, package.json, .env.example, vite.config.js, app/root.jsx, app/entry.server.jsx,
app/shopify.server.js, app/db.server.js. If the error clearly comes from a missing dependency, prisma schema
mistake, or syntax error in one of the files shown to you, fix it there. If the error is caused by something
outside of the shown files (infrastructure, missing env var, network), say so in "diagnosis" and return an empty
"files" array — don't invent fixes to files that aren't broken.
Available dependencies: @remix-run/node, @remix-run/react, @shopify/polaris, @prisma/client (via "../db.server"),
react, react-dom. If you write prisma/schema.prisma, include ONLY "model"/"enum" blocks — never
"generator"/"datasource".

You will receive JSON: { "currentFiles": <existing feature files as {path, content}>, "errorLog": string }.

Respond with ONLY valid JSON:
{
  "diagnosis": string,
  "files": { "path": string, "content": string }[]
}

"files" should only include files that need to change to fix the error — omit every file that doesn't need to
change. Generate real, runnable JavaScript/JSX/Liquid code — no placeholders, no TypeScript syntax.`;

const TRIAGE_SYSTEM_PROMPT = `You are the Solution Architect for AI Shopify Builder, deciding whether a user's request has
enough detail and is buildable on this platform, or whether you should ask a clarifying question first.

This platform only builds ONE kind of app: a PRIVATE/custom Shopify Remix app, embedded in the store admin,
authenticated with a static Admin API access token (no OAuth flow). Codegen is restricted to admin UI routes
(app/routes/app.*.jsx using Polaris + the Admin GraphQL API) plus a Postgres-backed data model. It CANNOT build:
OAuth/public app-store listings, storefront checkout UI or checkout extensions, theme app extensions or Liquid
theme edits, POS extensions, Shopify Functions, multi-store distribution, or anything requiring a public webhook
callback outside the admin app itself.

A request is SUFFICIENT only if BOTH are true:
1. It names a concrete feature or workflow (e.g. "a loyalty program where customers earn points per purchase",
   "a product reviews widget with star ratings") — not generic with no specific feature named (e.g. "let's build
   a shopify app", "I want an app for my store", "build me something").
2. It's buildable as an admin-embedded feature on this platform — it doesn't require any of the unsupported
   capabilities listed above.

Respond with ONLY valid JSON:
{
  "sufficient": boolean,
  "question": string | null
}

If NOT sufficient because the request is too vague, "question" must be a single, short, friendly question asking
what kind of app or feature they want to build — offer 2-3 concrete examples to make it easy to answer.

If NOT sufficient because the request asks for something this platform can't build, "question" must briefly
explain the constraint in plain terms (no need to enumerate every unsupported capability) and suggest a buildable,
admin-side alternative that captures the spirit of the request, then ask if that works or if they'd like something
else admin-side.

If sufficient is true, "question" must be null.`;

const ENHANCE_SYSTEM_PROMPT = `You rewrite a rough, one-line Shopify app feature idea into a clearer, more specific
build request for an AI app generator. Keep the user's original intent and scope exactly — do not invent unrelated
features, do not expand into a bigger app than what was implied, do not add marketing language.

Make the request concrete: name the specific data being tracked, the specific admin actions a merchant would take,
and any obvious edge cases worth handling, when they're reasonably implied by the original idea. Keep it to 2-4
sentences of plain English, written as a request ("Build a ... that ..."), not a spec document or bullet list.

Respond with ONLY the rewritten request text — no preamble, no quotes, no markdown formatting.`;

export interface GenerationPlan {
  summary: string;
  features: string[];
  dataModels: { name: string; fields: string[] }[];
  shopifyApis: string[];
  files: { path: string; purpose: string }[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : raw).trim();
}

export async function planFromConversation(history: ChatMessageInput[]): Promise<GenerationPlan> {
  const provider = getAIProvider("claude");
  const raw = await provider.complete({
    system: PLANNING_SYSTEM_PROMPT,
    messages: history,
  });
  try {
    return JSON.parse(extractJson(raw)) as GenerationPlan;
  } catch {
    throw new Error("The AI response was cut off before it finished planning. Try again, or simplify the request.");
  }
}

export async function assessSpecificity(
  history: ChatMessageInput[],
): Promise<{ sufficient: boolean; question: string | null }> {
  const provider = getAIProvider("claude");
  const raw = await provider.complete({
    system: TRIAGE_SYSTEM_PROMPT,
    messages: history,
  });
  try {
    return JSON.parse(extractJson(raw)) as { sufficient: boolean; question: string | null };
  } catch {
    // Fail open — a triage hiccup shouldn't block the user from ever generating.
    return { sufficient: true, question: null };
  }
}

export async function enhancePrompt(prompt: string): Promise<string> {
  const provider = getAIProvider("claude");
  const raw = await provider.complete({
    system: ENHANCE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 300,
  });
  return raw.trim();
}

export async function generateFromPlan(plan: GenerationPlan, appName: string): Promise<GeneratedFile[]> {
  const provider = getAIProvider("claude");
  const scopedPlan = { ...plan, files: plan.files.slice(0, 6) };
  const raw = await provider.complete({
    system: CODEGEN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(scopedPlan) }],
    maxTokens: 16384,
  });
  let parsed: { files: GeneratedFile[] };
  try {
    parsed = JSON.parse(extractJson(raw)) as { files: GeneratedFile[] };
  } catch {
    throw new Error(
      "The AI response was cut off before it finished generating code. Try again, or describe a smaller feature.",
    );
  }
  return assembleFiles(plan, stripDocs(parsed.files), appName);
}

const DOC_PATHS = new Set(["readme.md", "deployment.md"]);
const SCAFFOLD_PATHS = new Set([
  "shopify.app.toml",
  "package.json",
  ".env.example",
  "app/shopify.server.js",
  "app/db.server.js",
  "vite.config.js",
  "app/root.jsx",
  "app/entry.server.jsx",
]);

function stripDocs(files: GeneratedFile[]): GeneratedFile[] {
  return files.filter((f) => !DOC_PATHS.has(f.path.toLowerCase()) && !SCAFFOLD_PATHS.has(f.path.toLowerCase()));
}

const PRISMA_HEADER = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

// Required by @shopify/shopify-app-session-storage-prisma regardless of what data models the app has.
const SESSION_MODEL = `model Session {
  id            String    @id
  shop          String
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String
  userId        BigInt?
  firstName     String?
  lastName      String?
  email         String?
  accountOwner  Boolean   @default(false)
  locale        String?
  collaborator  Boolean?  @default(false)
  emailVerified Boolean?  @default(false)
}
`;

// The deploy pipeline is Postgres-only, so the schema's generator/datasource blocks are always owned
// deterministically here — the AI is free to choose whatever provider it wants (it sometimes picks sqlite),
// so we strip any generator/datasource block it wrote and keep only its model/enum definitions.
function normalizePrismaSchema(files: GeneratedFile[]): GeneratedFile[] {
  const index = files.findIndex((f) => f.path.toLowerCase() === "prisma/schema.prisma");
  const modelsOnly =
    index === -1
      ? ""
      : files[index].content
          .replace(/^\s*generator\s+\w+\s*\{[^}]*\}\s*$/gm, "")
          .replace(/^\s*datasource\s+\w+\s*\{[^}]*\}\s*$/gm, "")
          .trim();

  const hasSession = /model\s+Session\s*\{/.test(modelsOnly);
  const content = [PRISMA_HEADER.trimEnd(), "", modelsOnly, hasSession ? "" : SESSION_MODEL]
    .filter(Boolean)
    .join("\n\n")
    .trim() + "\n";

  const file = { path: "prisma/schema.prisma", content };
  if (index === -1) return [...files, file];
  const next = [...files];
  next[index] = file;
  return next;
}

function assembleFiles(plan: GenerationPlan, codeFiles: GeneratedFile[], appName: string): GeneratedFile[] {
  const scaffoldFiles = buildShopifyScaffold(plan, appName);
  const allCodeFiles = normalizePrismaSchema([...scaffoldFiles, ...codeFiles]);
  return [
    { path: "README.md", content: buildReadme(plan, allCodeFiles, appName) },
    { path: "DEPLOYMENT.md", content: buildDeploymentGuide(plan, allCodeFiles, appName) },
    ...allCodeFiles,
  ];
}

export async function revisePlanFromChange(
  previousPlan: GenerationPlan,
  changeRequest: string,
): Promise<GenerationPlan> {
  const provider = getAIProvider("claude");

  const planRaw = await provider.complete({
    system: PLAN_REVISION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify({ currentPlan: previousPlan, changeRequest }) }],
  });
  let revisedPlanFields: GenerationPlan;
  try {
    revisedPlanFields = JSON.parse(extractJson(planRaw)) as GenerationPlan;
  } catch {
    throw new Error("The AI response was cut off before it finished revising the plan. Try again.");
  }
  // Preserve fields not part of the AI-facing schema (e.g. logoUrl set in Configure).
  return { ...previousPlan, ...revisedPlanFields };
}

export async function reviseFilesFromChange(
  plan: GenerationPlan,
  previousFiles: GeneratedFile[],
  changeRequest: string,
  appName: string,
): Promise<GeneratedFile[]> {
  const provider = getAIProvider("claude");
  const previousCodeFiles = stripDocs(previousFiles);

  const filesRaw = await provider.complete({
    system: FILES_REVISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ plan, currentFiles: previousCodeFiles, changeRequest }),
      },
    ],
    maxTokens: 16384,
  });
  let changed: { files: GeneratedFile[]; removedFiles?: string[] };
  try {
    changed = JSON.parse(extractJson(filesRaw)) as { files: GeneratedFile[]; removedFiles?: string[] };
  } catch {
    throw new Error("The AI response was cut off before it finished revising the code. Try again.");
  }

  const removed = new Set((changed.removedFiles ?? []).map((p) => p.toLowerCase()));
  const merged = previousCodeFiles.filter((f) => !removed.has(f.path.toLowerCase()));
  for (const file of stripDocs(changed.files)) {
    const index = merged.findIndex((f) => f.path === file.path);
    if (index >= 0) merged[index] = file;
    else merged.push(file);
  }

  return assembleFiles(plan, merged, appName);
}

export async function fixFromError(
  plan: GenerationPlan,
  previousFiles: GeneratedFile[],
  errorLog: string,
  appName: string,
): Promise<{ diagnosis: string; files: GeneratedFile[]; changed: boolean }> {
  const provider = getAIProvider("claude");
  const previousCodeFiles = stripDocs(previousFiles);

  const raw = await provider.complete({
    system: FIX_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ currentFiles: previousCodeFiles, errorLog: errorLog.slice(0, 8000) }),
      },
    ],
    maxTokens: 16384,
  });
  let parsed: { diagnosis: string; files: GeneratedFile[] };
  try {
    parsed = JSON.parse(extractJson(raw)) as { diagnosis: string; files: GeneratedFile[] };
  } catch {
    throw new Error("The AI response was cut off before it finished diagnosing the error. Try again.");
  }

  if (!parsed.files || parsed.files.length === 0) {
    return { diagnosis: parsed.diagnosis, files: previousFiles, changed: false };
  }

  const merged = [...previousCodeFiles];
  for (const file of stripDocs(parsed.files)) {
    const index = merged.findIndex((f) => f.path === file.path);
    if (index >= 0) merged[index] = file;
    else merged.push(file);
  }

  return { diagnosis: parsed.diagnosis, files: assembleFiles(plan, merged, appName), changed: true };
}

function buildReadme(plan: GenerationPlan, files: GeneratedFile[], appName: string): string {
  const lines: string[] = [];

  lines.push(`# ${appName}`, "", plan.summary, "");

  lines.push("## Features", "");
  for (const feature of plan.features) lines.push(`- ${feature}`);
  lines.push("");

  lines.push("## Shopify APIs used", "");
  for (const api of plan.shopifyApis) lines.push(`- ${api}`);
  lines.push("");

  if (plan.dataModels.length > 0) {
    lines.push("## Data models", "");
    for (const model of plan.dataModels) {
      lines.push(`### ${model.name}`, "");
      for (const field of model.fields) lines.push(`- \`${field}\``);
      lines.push("");
    }
  }

  lines.push("## File structure", "", "```");
  for (const file of files) lines.push(file.path);
  lines.push("```", "");

  lines.push(
    "## End-to-end workflow",
    "",
    "This app was planned and generated by AI Shopify Builder from a natural-language",
    "conversation. Here's how the pieces fit together:",
    "",
    "1. **Conversation → Plan.** Your chat messages were turned into a structured implementation",
    "   plan (features, data models, Shopify APIs, and a file list) by the planning step.",
    "2. **Plan → Code.** The plan was handed to the code generation step, which produced the",
    "   source files listed above — routes, data access, and any theme extensions.",
    "3. **Review & configure.** Use the **Code** tab to browse the generated files by folder, and",
    "   the **Configure** tab to edit the app name, description, features, data models, Shopify",
    "   APIs, and app icon before shipping.",
    "4. **Regenerate.** Send another message describing changes — a new plan and file set is",
    "   generated automatically.",
    "",
    "## Getting started",
    "",
    "```bash",
    "npm install",
    "npm run dev   # starts the Remix dev server directly — no Shopify CLI or Partner account needed",
    "```",
    "",
    "This includes a runnable Shopify app scaffold (`shopify.app.toml`, `app/shopify.server.js`) that talks",
    "to the Shopify Admin API with a static access token — no Partner account or OAuth needed. Copy",
    "`.env.example` to `.env`, fill in `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` (see",
    "DEPLOYMENT.md), and wire up the data models with your database of choice.",
    "",
    "## Deployment",
    "",
    "See [DEPLOYMENT.md](./DEPLOYMENT.md) for how to ship this app to a Shopify store.",
    "",
  );

  return lines.join("\n");
}

function buildDeploymentGuide(plan: GenerationPlan, files: GeneratedFile[], appName: string): string {
  const hasExtension = files.some((f) => f.path.startsWith("extensions/"));
  const hasWebhook = files.some((f) => /webhook/i.test(f.path));
  const hasDataModel = plan.dataModels.length > 0;
  const lines: string[] = [];

  lines.push("# Deployment guide", "", `How to ship "${appName}" to a real Shopify store.`, "");

  lines.push(
    "## 1. Prerequisites",
    "",
    "- Admin (owner or staff with app development permission) access to the Shopify store this will run on",
    "- Node.js 18+ and the package manager this project uses",
    hasDataModel ? "- A production database (the generated data models need somewhere to live)" : "",
    "",
  );

  lines.push(
    "## 2. Create the custom app in your store admin",
    "",
    "This is a **private app** — it's installed directly on your own store, no Shopify Partner account or",
    "app review required.",
    "",
    "1. In your store admin, go to **Settings > Apps and sales channels > Develop apps**, and enable custom",
    "   app development if you haven't already.",
    "2. Click **Create an app**, name it, and open **Configuration**.",
    "3. Under **Admin API integration**, grant these access scopes (match what this app's plan needs — see",
    "   `shopify.app.toml`): scopes listed there, e.g. `read_products,write_products`.",
    "4. Click **Install app**, then open the **API credentials** tab and reveal the **Admin API access token**.",
    "   Copy it now — Shopify only shows it once.",
    hasWebhook
      ? "5. Register the webhook topics this app relies on (see the webhook handlers in the file list) under Notifications."
      : "",
    "",
    "If you generated this app through the AI Shopify Builder dashboard, paste the store domain and this",
    "token into the **Install** panel there — it validates the token, stores it, and pushes it to your",
    "deployed app as a secret automatically.",
    "",
  );

  lines.push(
    "## 3. Environment variables",
    "",
    "Set these wherever the app is hosted:",
    "",
    "| Variable | Purpose |",
    "| --- | --- |",
    "| `SHOPIFY_STORE_DOMAIN` | Your store's `*.myshopify.com` domain |",
    "| `SHOPIFY_ADMIN_ACCESS_TOKEN` | The Admin API access token from step 2 |",
    hasDataModel ? "| `DATABASE_URL` | Connection string for the production database |" : "",
    "",
  );

  if (hasDataModel) {
    lines.push(
      "## 4. Database",
      "",
      "Run migrations against the production database before first boot, e.g.:",
      "",
      "```bash",
      "npx prisma migrate deploy",
      "```",
      "",
    );
  }

  lines.push(
    `## ${hasDataModel ? "5" : "4"}. Deploy the backend`,
    "",
    "Deploy the generated routes/server code to your host of choice (Fly.io, Render, Railway,",
    "Heroku, or a VM). Whichever you pick, make sure it:",
    "",
    "- Serves over HTTPS",
    "- Has the environment variables from step 3 set",
    hasWebhook ? "- Stays running (webhooks need a live endpoint, not just `npm run dev`)" : "",
    "",
  );

  if (hasExtension) {
    lines.push(
      `## ${hasDataModel ? "6" : "5"}. Deploy theme/UI extensions`,
      "",
      "This app includes extensions under `extensions/`. Ship them with the Shopify CLI:",
      "",
      "```bash",
      "shopify app deploy",
      "```",
      "",
      "This uploads a new version of the extension(s) and (optionally) releases it to stores that",
      "have the app installed.",
      "",
    );
  }

  const checklist = [
    "- [ ] Custom app installs cleanly and the Admin API token works against real store data",
    hasWebhook && "- [ ] Webhooks fire and are handled without errors",
    "- [ ] Core features from the plan above work end-to-end against real store data",
    "- [ ] Environment variables are set in the production environment, not just locally",
  ].filter((item): item is string => Boolean(item));

  lines.push(`## ${hasExtension ? (hasDataModel ? "7" : "6") : hasDataModel ? "6" : "5"}. Go live checklist`, "", ...checklist, "");

  return lines.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "shopify-app";
}

/**
 * Deterministic Shopify app scaffold (never AI-generated) — this is the boilerplate that makes a generated
 * app actually installable on a store: the OAuth install/callback route, Shopify SDK config, and app manifest.
 * Kept deterministic rather than AI-authored since it's security-sensitive and near-identical to Shopify's own
 * official Remix app template.
 */
function buildShopifyScaffold(plan: GenerationPlan, appName: string): GeneratedFile[] {
  const slug = slugify(appName);
  const hasDataModel = plan.dataModels.length > 0;

  const files: GeneratedFile[] = [
    {
      path: "shopify.app.toml",
      content: [
        `# This app is a PRIVATE/custom app, installed directly from the merchant's store admin`,
        `# (Settings > Apps and sales channels > Develop apps) rather than the Partner Dashboard.`,
        `# There's no client_id/secret or OAuth — the store issues a static Admin API access token`,
        `# scoped to exactly the access scopes below, which the merchant grants when creating the app.`,
        `name = "${appName}"`,
        `handle = "${slug}"`,
        "",
        `[access_scopes]`,
        `# Adjust to match what this app actually needs — see https://shopify.dev/docs/api/usage/access-scopes`,
        `# Grant these same scopes when creating the custom app in the store admin.`,
        `scopes = "read_products,write_products"`,
        "",
        `[webhooks]`,
        `api_version = "2025-01"`,
        "",
      ].join("\n"),
    },
    {
      path: "app/shopify.server.js",
      content: [
        `// Private/custom-app Admin API client — authenticates with a static Admin API access token`,
        `// generated by the merchant in their store admin (Settings > Apps > Develop apps), instead of`,
        `// Shopify's OAuth flow. There is no login/callback route: the token is provisioned once via`,
        `// the SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN environment variables.`,
        `const API_VERSION = "2025-01";`,
        "",
        `function assertConfigured() {`,
        `  if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {`,
        `    throw new Response("This app hasn't been installed on a store yet.", { status: 503 });`,
        `  }`,
        `}`,
        "",
        `async function graphql(query, options = {}) {`,
        `  assertConfigured();`,
        `  return fetch(`,
        `    \`https://\${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/\${API_VERSION}/graphql.json\`,`,
        `    {`,
        `      method: "POST",`,
        `      headers: {`,
        `        "Content-Type": "application/json",`,
        `        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,`,
        `      },`,
        `      body: JSON.stringify({ query, variables: options.variables }),`,
        `    },`,
        `  );`,
        `}`,
        "",
        `async function rest(path, options = {}) {`,
        `  assertConfigured();`,
        `  return fetch(\`https://\${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/\${API_VERSION}\${path}\`, {`,
        `    ...options,`,
        `    headers: {`,
        `      "Content-Type": "application/json",`,
        `      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,`,
        `      ...options.headers,`,
        `    },`,
        `  });`,
        `}`,
        "",
        `export const authenticate = {`,
        `  // Kept as an async function so it matches the shape every route already calls:`,
        `  // \`const { admin, session } = await authenticate.admin(request);\``,
        `  admin: async (_request) => {`,
        `    assertConfigured();`,
        `    return { admin: { graphql, rest }, session: { shop: process.env.SHOPIFY_STORE_DOMAIN } };`,
        `  },`,
        `};`,
        "",
      ].join("\n"),
    },
    {
      path: "app/db.server.js",
      content: [
        `import { PrismaClient } from "@prisma/client";`,
        "",
        `// Reuse a single client across hot reloads in development.`,
        `const globalForPrisma = globalThis;`,
        `const prisma = globalForPrisma.prisma ?? new PrismaClient();`,
        `if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;`,
        "",
        `export default prisma;`,
        "",
      ].join("\n"),
    },
    {
      path: "vite.config.js",
      content: [
        `import { vitePlugin as remix } from "@remix-run/dev";`,
        `import { defineConfig } from "vite";`,
        "",
        `export default defineConfig({`,
        `  plugins: [`,
        `    remix({`,
        `      ignoredRouteFiles: ["**/.*"],`,
        `    }),`,
        `  ],`,
        `});`,
        "",
      ].join("\n"),
    },
    {
      path: "app/root.jsx",
      content: [
        `import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";`,
        "",
        `export default function App() {`,
        `  return (`,
        `    <html>`,
        `      <head>`,
        `        <meta charSet="utf-8" />`,
        `        <meta name="viewport" content="width=device-width,initial-scale=1" />`,
        `        <link rel="preconnect" href="https://cdn.shopify.com/" />`,
        `        <Meta />`,
        `        <Links />`,
        `      </head>`,
        `      <body>`,
        `        <Outlet />`,
        `        <ScrollRestoration />`,
        `        <Scripts />`,
        `      </body>`,
        `    </html>`,
        `  );`,
        `}`,
        "",
      ].join("\n"),
    },
    {
      path: "app/entry.server.jsx",
      content: [
        `import { PassThrough } from "stream";`,
        `import { renderToPipeableStream } from "react-dom/server";`,
        `import { RemixServer } from "@remix-run/react";`,
        `import { createReadableStreamFromReadable } from "@remix-run/node";`,
        "",
        `export const streamTimeout = 5000;`,
        "",
        `export default async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {`,
        `  const userAgent = request.headers.get("user-agent");`,
        `  const callbackName = userAgent && /bot|crawl|spider/i.test(userAgent) ? "onAllReady" : "onShellReady";`,
        "",
        `  return new Promise((resolve, reject) => {`,
        `    const { pipe, abort } = renderToPipeableStream(`,
        `      <RemixServer context={remixContext} url={request.url} />,`,
        `      {`,
        `        [callbackName]: () => {`,
        `          const body = new PassThrough();`,
        `          const stream = createReadableStreamFromReadable(body);`,
        `          responseHeaders.set("Content-Type", "text/html");`,
        `          resolve(`,
        `            new Response(stream, {`,
        `              headers: responseHeaders,`,
        `              status: responseStatusCode,`,
        `            }),`,
        `          );`,
        `          pipe(body);`,
        `        },`,
        `        onShellError(error) {`,
        `          reject(error);`,
        `        },`,
        `        onError(error) {`,
        `          responseStatusCode = 500;`,
        `          console.error(error);`,
        `        },`,
        `      },`,
        `    );`,
        `    setTimeout(abort, streamTimeout + 1000);`,
        `  });`,
        `}`,
        "",
      ].join("\n"),
    },
    {
      path: "package.json",
      content:
        JSON.stringify(
          {
            name: slug,
            private: true,
            version: "1.0.0",
            scripts: {
              dev: "remix vite:dev",
              build: "remix vite:build",
              start: "remix-serve ./build/server/index.js",
            },
            dependencies: {
              "@prisma/client": "^5.22.0",
              "@remix-run/node": "^2.0.0",
              "@remix-run/react": "^2.0.0",
              "@remix-run/serve": "^2.0.0",
              "@shopify/polaris": "^12.0.0",
              isbot: "^5.1.0",
              react: "^18.2.0",
              "react-dom": "^18.2.0",
            },
            devDependencies: {
              "@remix-run/dev": "^2.0.0",
              prisma: "^5.22.0",
              typescript: "^5.2.2",
            },
            engines: {
              node: ">=18.20",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: ".env.example",
      content:
        [
          `# Generated by creating a custom app in your store admin (Settings > Apps > Develop apps)`,
          `# and installing it — no Partner account or OAuth needed.`,
          `SHOPIFY_STORE_DOMAIN=your-store.myshopify.com`,
          `SHOPIFY_ADMIN_ACCESS_TOKEN=`,
          ...(hasDataModel ? [`DATABASE_URL=`] : []),
        ].join("\n") + "\n",
    },
  ];

  return files;
}
