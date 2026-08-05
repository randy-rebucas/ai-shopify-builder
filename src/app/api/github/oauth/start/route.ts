import { NextRequest, NextResponse } from "next/server";
import { getSession, signOAuthState } from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/github";
import { canUseGithubIntegration } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

function popupError(message: string, code?: string): NextResponse {
  const html = `<!doctype html><html><body><script>
    window.opener && window.opener.postMessage(${JSON.stringify({ source: "github-oauth", ok: false, error: message, code })}, window.location.origin);
    window.close();
  </script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const project = await findAccessibleProject(session.userId, projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canUseGithubIntegration(project.userId);
  if (!eligibility.allowed) {
    return popupError(eligibility.reason ?? "GitHub integration isn't included in your plan.", "PLAN_LIMIT");
  }

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
