import { NextRequest, NextResponse } from "next/server";

// Defense-in-depth against CSRF, alongside the session cookie's `sameSite: "lax"` (src/lib/auth.ts)
// — SameSite=Lax already blocks the cross-site cookie-bearing requests that make CSRF work in the
// first place, but this adds an independent check that doesn't rely on cookie handling being
// correct everywhere: any state-changing request to /api/* must have an Origin (or, failing that,
// Referer) header matching this app's own host. A genuine cross-site browser request always
// carries one of those headers on non-GET/HEAD methods — only same-origin requests (or non-browser
// clients that don't send either, which can't be a browser-driven CSRF in the first place) get
// through when both are absent.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const sourceHeader = request.headers.get("origin") ?? request.headers.get("referer");
  if (!sourceHeader) return NextResponse.next();

  let sourceHost: string;
  try {
    sourceHost = new URL(sourceHeader).host;
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (sourceHost !== request.nextUrl.host) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
