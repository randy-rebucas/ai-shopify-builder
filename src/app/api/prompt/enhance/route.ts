import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { enhancePrompt } from "@/lib/ai/generate";
import { isRateLimited } from "@/lib/rate-limit";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRateLimited(`prompt-enhance:${session.userId}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a short idea first." }, { status: 400 });
  }

  try {
    const enhanced = await enhancePrompt(parsed.data.prompt);
    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json({ error: "Couldn't enhance the prompt. Try again." }, { status: 500 });
  }
}
