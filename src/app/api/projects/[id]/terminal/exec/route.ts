import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { execCommand, hasSession } from "@/lib/terminal";
import { isRateLimited } from "@/lib/rate-limit";
import { findAccessibleProject } from "@/lib/project-access";

const bodySchema = z.object({ command: z.string().min(1).max(4000) });

type ExecEvent =
  | { type: "stdout" | "stderr"; data: string }
  | { type: "exit"; exitCode: number | null; truncated: boolean }
  | { type: "error"; error: string };

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isRateLimited(`terminal-exec:${session.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many commands. Slow down." }, { status: 429 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasSession(id)) {
    return NextResponse.json({ error: "No terminal session — open the Terminal tab first." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ExecEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const { exitCode, truncated } = await execCommand(id, parsed.data.command, (streamName, data) => {
          emit({ type: streamName, data });
        });
        emit({ type: "exit", exitCode, truncated });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Command failed";
        emit({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
