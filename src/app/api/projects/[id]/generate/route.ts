import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  planFromConversation,
  generateFromPlan,
  revisePlanFromChange,
  reviseFilesFromChange,
  assessSpecificity,
} from "@/lib/ai/generate";
import type { GenerationPlan, GeneratedFile } from "@/lib/ai/generate";
import type { ChatMessageInput } from "@/lib/ai/types";
import { generateRandomAppName } from "@/lib/random-name";
import { isRateLimited } from "@/lib/rate-limit";

const MAX_CLARIFICATION_ROUNDS = 3;

// Streamed as newline-delimited JSON so the client can show live progress instead of waiting
// for the whole (multi-AI-call, tens-of-seconds) generation to finish before rendering anything.
type ProgressEvent =
  | { type: "planning" }
  | { type: "plan"; files: { path: string; purpose: string }[]; projectName: string }
  | { type: "clarification"; message: unknown; projectName: string }
  | { type: "result"; app: unknown; projectName: string }
  | { type: "error"; error: string };

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each call triggers multiple AI provider requests (planning + generation, tens of seconds) —
  // unlike the other project routes, this one has real per-request cost, so it needs its own limit.
  if (isRateLimited(`generate:${session.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many generation requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const requestStartedAt = Date.now();
  const log = (stage: string) => console.log(`[generate:${id}] ${stage} (+${Date.now() - requestStartedAt}ms)`);

  let project = await prisma.project.findFirst({ where: { id, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  log("request received");

  const history = await prisma.chatMessage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  if (history.length === 0) {
    return NextResponse.json({ error: "No conversation to generate from" }, { status: 400 });
  }

  await prisma.project.update({ where: { id }, data: { status: "PLANNING" } });

  const conversation: ChatMessageInput[] = history.map((m) => ({
    role: m.role.toLowerCase() as "user" | "assistant",
    content: m.content,
  }));

  const previousApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ProgressEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      if (!project) return;

      try {
        let plan: GenerationPlan;
        let files: GeneratedFile[];

        if (previousApp) {
          const changeRequest = conversation[conversation.length - 1]?.content ?? "";
          await prisma.project.update({ where: { id }, data: { status: "GENERATING" } });
          log("revising plan — calling AI");
          emit({ type: "planning" });
          plan = await revisePlanFromChange(previousApp.plan as unknown as GenerationPlan, changeRequest);
          log("plan revision complete — calling AI for codegen");
          emit({ type: "plan", files: plan.files, projectName: project.name });
          files = await reviseFilesFromChange(
            plan,
            previousApp.files as unknown as GeneratedFile[],
            changeRequest,
            project.name,
          );
          log("file revision complete");
        } else {
          const priorClarifications = history.filter((m) => m.role === "ASSISTANT").length;
          const triage =
            priorClarifications >= MAX_CLARIFICATION_ROUNDS
              ? { sufficient: true, question: null }
              : await (async () => {
                  log("triaging specificity — calling AI");
                  const result = await assessSpecificity(conversation);
                  log(`triage complete — sufficient=${result.sufficient}`);
                  return result;
                })();
          if (!triage.sufficient) {
            await prisma.project.update({ where: { id }, data: { status: project.status } });
            const question = await prisma.chatMessage.create({
              data: {
                projectId: id,
                role: "ASSISTANT",
                content: triage.question ?? "What kind of app or feature would you like to build?",
              },
            });
            emit({ type: "clarification", message: question, projectName: project.name });
            return;
          }

          if (!project.nameConfirmed) {
            project = await prisma.project.update({
              where: { id },
              data: { name: generateRandomAppName(), nameConfirmed: true },
            });
          }

          log("planning — calling AI");
          emit({ type: "planning" });
          plan = await planFromConversation(conversation);
          log("planning complete — calling AI for codegen");
          emit({ type: "plan", files: plan.files, projectName: project.name });
          await prisma.project.update({ where: { id }, data: { status: "GENERATING" } });
          files = await generateFromPlan(plan, project.name);
          log(`codegen complete — ${files.length} file(s)`);
        }

        const generatedApp = await prisma.generatedApp.create({
          data: {
            projectId: id,
            plan: plan as unknown as Prisma.InputJsonValue,
            files: files as unknown as Prisma.InputJsonValue,
          },
        });

        await prisma.chatMessage.create({
          data: {
            projectId: id,
            role: "ASSISTANT",
            content: previousApp
              ? `Updated the app based on your request. ${files.length} file(s) in the project now.`
              : `Generated ${files.length} file(s) for: ${plan.summary}`,
          },
        });

        await prisma.project.update({ where: { id }, data: { status: "READY" } });
        log("done — status READY");

        emit({ type: "result", app: generatedApp, projectName: project.name });
      } catch (error) {
        log(`failed — ${error instanceof Error ? error.message : String(error)}`);
        console.error(`[generate:${id}] error`, error);
        await prisma.project.update({ where: { id }, data: { status: "FAILED" } });
        const message = error instanceof Error ? error.message : "Generation failed";
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
