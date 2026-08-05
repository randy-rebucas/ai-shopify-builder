import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { Client } from "pg";
import type { GeneratedFile } from "./ai/generate";
import { filterSafeGeneratedFiles } from "./generated-file-path";

const execFileAsync = promisify(execFile);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured — deploy automation is unavailable.`);
  return value;
}

export function isDeployConfigured(): boolean {
  return !!(
    process.env.FLY_API_TOKEN &&
    process.env.FLY_ORG &&
    process.env.FLY_POSTGRES_HOST &&
    process.env.FLY_POSTGRES_PASSWORD
  );
}

function flyEnv() {
  return { ...process.env, FLY_API_TOKEN: requireEnv("FLY_API_TOKEN") };
}

async function runFly(args: string[], opts: { cwd?: string; timeout?: number } = {}): Promise<string> {
  const bin = process.env.FLYCTL_PATH || "flyctl";
  const { stdout, stderr } = await execFileAsync(bin, args, {
    cwd: opts.cwd,
    env: flyEnv(),
    timeout: opts.timeout ?? 5 * 60_000,
    maxBuffer: 1024 * 1024 * 32,
  });
  return stdout + stderr;
}

export function slugifyAppSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "shopify-app";
}

/** Fly's abuse filter blocks certain words (e.g. "verify") in public app names. */
const BLOCKED_NAME_WORDS = ["verify", "verification", "secure", "login", "account", "paypal"];

export function flyAppNameFor(projectId: string, projectName: string): string {
  let slug = slugifyAppSlug(projectName);
  for (const word of BLOCKED_NAME_WORDS) {
    slug = slug.replace(new RegExp(word, "gi"), "app");
  }
  const suffix = projectId.slice(-8).toLowerCase();
  const trimmed = slug.slice(0, 40).replace(/-+$/, "");
  return `${trimmed}-${suffix}`;
}

export async function materialize(files: GeneratedFile[], dir: string): Promise<void> {
  const { safe, rejected } = filterSafeGeneratedFiles(files);
  if (rejected.length > 0) {
    console.warn(`materialize: skipped ${rejected.length} unsafe generated file path(s):`, rejected);
  }
  const root = path.resolve(dir);
  for (const file of safe) {
    const target = path.resolve(root, file.path);
    // Belt-and-suspenders on top of filterSafeGeneratedFiles: confirm the resolved path still
    // lands inside `root` before touching the filesystem.
    if (target !== root && !target.startsWith(root + path.sep)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
  }
}

const DOCKERFILE = `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "start"]
`;

function flyToml(appName: string, region: string): string {
  return `app = '${appName}'
primary_region = '${region}'

[build]

[deploy]
  release_command = 'npx prisma db push --accept-data-loss --skip-generate'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = 'shared-cpu-1x'
`;
}

async function ensureApp(appName: string, org: string): Promise<void> {
  const output = await runFly(["apps", "create", appName, "--org", org]);
  if (/already been taken/i.test(output) && !/created/i.test(output)) {
    // Fine — a previous deploy of this project already created it.
    return;
  }
}

/**
 * Creates a per-project database inside the shared platform Postgres cluster. Since that cluster only
 * resolves on Fly's private network, we reach it the same way `flyctl postgres connect` does: tunnel in
 * via `flyctl proxy`, talk to it as if it were local, then tear the tunnel down.
 */
function assertSafeSqlIdentifier(identifier: string): void {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Refusing to use "${identifier}" as a SQL identifier — contains disallowed characters.`);
  }
}

async function ensureDatabase(dbName: string): Promise<void> {
  const pgApp = requireEnv("FLY_POSTGRES_APP");
  const password = requireEnv("FLY_POSTGRES_PASSWORD");
  const localPort = 10000 + Math.floor(Math.random() * 10000);

  const bin = process.env.FLYCTL_PATH || "flyctl";
  const proxy = execFile(bin, ["proxy", `${localPort}:5432`, "-a", pgApp], { env: flyEnv() });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for Fly Postgres proxy to start.")), 20_000);
      proxy.stdout?.on("data", (chunk: Buffer) => {
        if (chunk.toString().includes("Proxying")) {
          clearTimeout(timer);
          resolve();
        }
      });
      proxy.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const client = new Client({
      host: "127.0.0.1",
      port: localPort,
      user: "postgres",
      password,
      database: "postgres",
      ssl: false,
      connectionTimeoutMillis: 15_000,
    });
    await client.connect();
    try {
      const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
      if (exists.rowCount === 0) {
        // Postgres doesn't support parameterized identifiers, so this has to be string-interpolated.
        // dbName is already restricted to [a-z0-9_] by slugifyAppSlug at the call site, but assert
        // it again here — right next to the query — so this stays safe even if that upstream
        // sanitization is ever loosened, instead of relying on it silently staying correct forever.
        assertSafeSqlIdentifier(dbName);
        await client.query(`CREATE DATABASE "${dbName}"`);
      }
    } finally {
      await client.end();
    }
  } finally {
    proxy.kill();
  }
}

// Deliberately NOT `runFly(["secrets", "set", "-a", appName, "KEY=value", ...])` — passing secret
// values as CLI arguments puts them in `ps`/`/proc/<pid>/cmdline` output on the host for as long as
// the process runs, AND (confirmed) gets them echoed verbatim into the thrown Error's message on
// failure (Node's execFile includes the full command+args in "Command failed: ..." errors), which
// this app then truncates and stores/returns as `deployError`/`installError` — a real plaintext
// secret leak into the database and back to the client on any transient flyctl failure. `flyctl
// secrets import` reads NAME=VALUE pairs from stdin instead, so no secret value ever appears in
// argv or in a command-echo error message.
async function setSecrets(appName: string, dir: string, secrets: Record<string, string>): Promise<void> {
  const bin = process.env.FLYCTL_PATH || "flyctl";
  const input = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, ["secrets", "import", "-a", appName], { cwd: dir, env: flyEnv() });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`flyctl secrets import failed (exit ${code}): ${stderr.slice(0, 2000)}`));
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

export interface DeployResult {
  appName: string;
  url: string;
}

/** Pushes secrets (e.g. a freshly-issued Shopify Admin API token) to an already-deployed Fly app. */
export async function setAppSecrets(appName: string, secrets: Record<string, string>): Promise<void> {
  await setSecrets(appName, process.cwd(), secrets);
}

export async function deployProject(params: {
  projectId: string;
  projectName: string;
  files: GeneratedFile[];
  extraSecrets?: Record<string, string>;
}): Promise<DeployResult> {
  if (!isDeployConfigured()) {
    throw new Error("Deploy automation isn't configured on this server (missing FLY_* environment variables).");
  }

  const org = requireEnv("FLY_ORG");
  const region = process.env.FLY_REGION || "iad";
  const pgHost = requireEnv("FLY_POSTGRES_HOST");
  const pgPassword = requireEnv("FLY_POSTGRES_PASSWORD");

  const appName = flyAppNameFor(params.projectId, params.projectName);
  const dbName = slugifyAppSlug(params.projectName).replace(/-/g, "_").slice(0, 60) || "app";

  const dir = await mkdtemp(path.join(tmpdir(), "ai-shopify-deploy-"));
  try {
    await materialize(params.files, dir);
    await writeFile(path.join(dir, "Dockerfile"), DOCKERFILE, "utf8");
    await writeFile(path.join(dir, "fly.toml"), flyToml(appName, region), "utf8");

    await ensureApp(appName, org);
    await ensureDatabase(dbName);
    await setSecrets(appName, dir, {
      DATABASE_URL: `postgres://postgres:${pgPassword}@${pgHost}:5432/${dbName}`,
      ...params.extraSecrets,
    });

    await runFly(["deploy", "--remote-only", "--yes"], { cwd: dir, timeout: 10 * 60_000 });

    return { appName, url: `https://${appName}.fly.dev` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
