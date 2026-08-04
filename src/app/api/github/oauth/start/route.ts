import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, signOAuthState } from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/github";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const state = await signOAuthState({ purpose: "github-connect", userId: session.userId, projectId });
  const redirectUri = new URL("/api/github/oauth/callback", request.nextUrl.origin).toString();

  try {
    const authorizeUrl = buildAuthorizeUrl(redirectUri, state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub OAuth isn't configured on this server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
