import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  shopifyApis: z.array(z.string()).optional(),
  dataModels: z.array(z.object({ name: z.string(), fields: z.array(z.string()) })).optional(),
  logoUrl: z
    .union([
      z.string().refine(
        (val) => {
          try {
            return ["http:", "https:"].includes(new URL(val).protocol);
          } catch {
            return false;
          }
        },
        { message: "Must be a valid http(s) URL" },
      ),
      z.literal(""),
    ])
    .optional(),
});

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, description, features, shopifyApis, dataModels, logoUrl } = parsed.data;

  if (name !== undefined || description !== undefined) {
    await prisma.project.update({ where: { id }, data: { name, description } });
  }

  let latestApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  if (
    latestApp &&
    (features !== undefined || shopifyApis !== undefined || dataModels !== undefined || logoUrl !== undefined)
  ) {
    const plan = latestApp.plan as Record<string, unknown>;
    const nextPlan = {
      ...plan,
      ...(features !== undefined ? { features } : {}),
      ...(shopifyApis !== undefined ? { shopifyApis } : {}),
      ...(dataModels !== undefined ? { dataModels } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    };
    latestApp = await prisma.generatedApp.update({
      where: { id: latestApp.id },
      data: { plan: nextPlan as unknown as Prisma.InputJsonValue },
    });
  }

  const updatedProject = await prisma.project.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ project: updatedProject, plan: latestApp?.plan ?? null });
}
