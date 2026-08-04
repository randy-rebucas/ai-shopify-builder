import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { materialize } from "./deploy";
import type { GeneratedFile } from "./ai/generate";

const execFileAsync = promisify(execFile);

const IDLE_TIMEOUT_MS = 15 * 60_000;
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 1_000_000;

// Isolated from the platform's own docker-compose network (`ai-shopify-builder_default`, which
// carries the Postgres container) — sandbox containers must never be able to resolve or route to
// platform services, only out to the public internet (needed for npm install etc).
const SANDBOX_NETWORK = "ai-shopify-terminal-sandbox";

// Custom image (docker/terminal-sandbox.Dockerfile) built on top of node:20-alpine, adding openssl
// (required by Prisma's query engine on musl), git, curl, and native-module build tools — a bare
// node:20-alpine is missing all of these.
const SANDBOX_IMAGE = "ai-shopify-terminal-sandbox:latest";
const SANDBOX_DOCKERFILE = path.join(process.cwd(), "docker", "terminal-sandbox.Dockerfile");

interface Session {
  projectId: string;
  containerId: string;
  dir: string;
  lastUsed: number;
}

const sessions = new Map<string, Session>();

async function ensureNetwork(): Promise<void> {
  try {
    await execFileAsync("docker", ["network", "inspect", SANDBOX_NETWORK]);
  } catch {
    await execFileAsync("docker", ["network", "create", "--driver", "bridge", SANDBOX_NETWORK]);
  }
}

async function ensureSandboxImage(): Promise<void> {
  try {
    await execFileAsync("docker", ["image", "inspect", SANDBOX_IMAGE]);
  } catch {
    await execFileAsync(
      "docker",
      ["build", "-f", SANDBOX_DOCKERFILE, "-t", SANDBOX_IMAGE, path.dirname(SANDBOX_DOCKERFILE)],
      { timeout: 5 * 60_000 },
    );
  }
}

async function reap(): Promise<void> {
  const now = Date.now();
  for (const [projectId, session] of sessions) {
    if (now - session.lastUsed > IDLE_TIMEOUT_MS) {
      await stopSession(projectId).catch(() => {});
    }
  }
}

export function hasSession(projectId: string): boolean {
  return sessions.has(projectId);
}

export async function startSession(projectId: string, files: GeneratedFile[]): Promise<void> {
  await reap();

  const existing = sessions.get(projectId);
  if (existing) {
    existing.lastUsed = Date.now();
    return;
  }

  await ensureNetwork();
  await ensureSandboxImage();

  const dir = await mkdtemp(path.join(tmpdir(), "ai-shopify-terminal-"));
  await materialize(files, dir);

  const { stdout } = await execFileAsync("docker", [
    "run",
    "-d",
    "--network",
    SANDBOX_NETWORK,
    "--memory=256m",
    "--cpus=1",
    "--pids-limit=128",
    "--cap-drop=ALL",
    "--security-opt",
    "no-new-privileges",
    "-v",
    `${dir}:/workspace`,
    "-w",
    "/workspace",
    SANDBOX_IMAGE,
    "sh",
    "-c",
    "sleep infinity",
  ]);

  sessions.set(projectId, {
    projectId,
    containerId: stdout.trim(),
    dir,
    lastUsed: Date.now(),
  });
}

export async function stopSession(projectId: string): Promise<void> {
  const session = sessions.get(projectId);
  if (!session) return;
  sessions.delete(projectId);
  await execFileAsync("docker", ["rm", "-f", session.containerId]).catch(() => {});
  await rm(session.dir, { recursive: true, force: true }).catch(() => {});
}

export async function execCommand(
  projectId: string,
  command: string,
  onChunk: (stream: "stdout" | "stderr", data: string) => void,
): Promise<{ exitCode: number | null; truncated: boolean }> {
  await reap();

  const session = sessions.get(projectId);
  if (!session) {
    throw new Error("No terminal session — open the Terminal tab first.");
  }
  session.lastUsed = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", session.containerId, "sh", "-c", command]);

    let outputBytes = 0;
    let truncated = false;
    let settled = false;

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, COMMAND_TIMEOUT_MS);

    function forward(stream: "stdout" | "stderr", data: Buffer) {
      if (truncated) return;
      outputBytes += data.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        truncated = true;
        onChunk(stream, "\n[output truncated — command produced too much output]\n");
        child.kill("SIGKILL");
        return;
      }
      onChunk(stream, data.toString("utf8"));
    }

    child.stdout.on("data", (data: Buffer) => forward("stdout", data));
    child.stderr.on("data", (data: Buffer) => forward("stderr", data));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: code, truncated });
    });
  });
}
