import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planFromConversation, generateFromPlan, reviseFromChange, assessSpecificity } from "@/lib/ai/generate";
import type { GenerationPlan, GeneratedFile } from "@/lib/ai/generate";
import type { ChatMessageInput } from "@/lib/ai/types";

const NAME_QUESTION = "What would you like to name this app?";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  try {
    let plan: GenerationPlan;
    let files: GeneratedFile[];

    if (previousApp) {
      const changeRequest = conversation[conversation.length - 1]?.content ?? "";
      await prisma.project.update({ where: { id }, data: { status: "GENERATING" } });
      log("revising existing app — calling AI");
      const revised = await reviseFromChange(
        previousApp.plan as unknown as GenerationPlan,
        previousApp.files as unknown as GeneratedFile[],
        changeRequest,
        project.name,
      );
      log("revision complete");
      plan = revised.plan;
      files = revised.files;
    } else {
      log("triaging specificity — calling AI");
      const triage = await assessSpecificity(conversation);
      log(`triage complete — sufficient=${triage.sufficient}`);
      if (!triage.sufficient) {
        await prisma.project.update({ where: { id }, data: { status: project.status } });
        const question = await prisma.chatMessage.create({
          data: {
            projectId: id,
            role: "ASSISTANT",
            content: triage.question ?? "What kind of app or feature would you like to build?",
          },
        });
        return NextResponse.json(
          { needsClarification: true, message: question, projectName: project.name },
          { status: 200 },
        );
      }

      if (!project.nameConfirmed) {
        const lastMessage = history[history.length - 1];
        const askedForName = history[history.length - 2]?.role === "ASSISTANT" && history[history.length - 2]?.content === NAME_QUESTION;

        if (askedForName && lastMessage) {
          const proposedName = lastMessage.content.trim().slice(0, 80);
          project = await prisma.project.update({
            where: { id },
            data: { name: proposedName || project.name, nameConfirmed: true },
          });
        } else {
          await prisma.project.update({ where: { id }, data: { status: project.status } });
          const question = await prisma.chatMessage.create({
            data: { projectId: id, role: "ASSISTANT", content: NAME_QUESTION },
          });
          return NextResponse.json(
            { needsClarification: true, message: question, projectName: project.name },
            { status: 200 },
          );
        }
      }

      log("planning — calling AI");
      plan = await planFromConversation(conversation);
      log("planning complete — calling AI for codegen");
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

    return NextResponse.json({ ...generatedApp, projectName: project.name }, { status: 201 });
  } catch (error) {
    log(`failed — ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[generate:${id}] error`, error);
    await prisma.project.update({ where: { id }, data: { status: "FAILED" } });
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
