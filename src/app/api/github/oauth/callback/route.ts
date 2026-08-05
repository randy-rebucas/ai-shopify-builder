import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOAuthState } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCodeForToken, verifyToken, ensureRepo } from "@/lib/github";
import { findAccessibleProject } from "@/lib/project-access";

function popupResponse(message: Record<string, unknown>): NextResponse {
  const html = `<!doctype html><html><body><script>
    window.opener && window.opener.postMessage(${JSON.stringify({ source: "github-oauth", ...message })}, window.location.origin);
    window.close();
  </script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return popupResponse({ ok: false, error: "Missing code or state from GitHub." });
  }

  const statePayload = await verifyOAuthState(state);
  if (!statePayload || statePayload.purpose !== "github-connect") {
    return popupResponse({ ok: false, error: "This authorization link is invalid or expired." });
  }

  const project = await findAccessibleProject(statePayload.userId, statePayload.projectId);
  if (!project) {
    return popupResponse({ ok: false, error: "Project not found." });
  }

  try {
    const redirectUri = new URL("/api/github/oauth/callback", request.nextUrl.origin).toString();
    const token = await exchangeCodeForToken(code, redirectUri);

    const user = await verifyToken(token);
    if (!user) {
      return popupResponse({ ok: false, error: "GitHub didn't return a valid user for this token." });
    }

    const repo = await ensureRepo(token, user.login, project.name);

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        githubTokenCiphertext: encryptSecret(token),
        githubRepoFullName: repo.fullName,
        githubRepoUrl: repo.htmlUrl,
        githubConnectedAt: new Date(),
      },
    });

    return popupResponse({
      ok: true,
      repoFullName: updated.githubRepoFullName,
      repoUrl: updated.githubRepoUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect to GitHub.";
    return popupResponse({ ok: false, error: message });
  }
}
