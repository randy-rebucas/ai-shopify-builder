const API_BASE = "https://api.github.com";
const OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  if (!process.env.GITHUB_CLIENT_ID) {
    throw new Error("GITHUB_CLIENT_ID environment variable must be set to connect GitHub accounts.");
  }
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "repo",
    state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new Error("GitHub OAuth isn't configured on this server.");
  }
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Failed to exchange GitHub OAuth code for a token.");
  }
  return data.access_token as string;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export interface GithubUser {
  login: string;
}

export async function verifyToken(token: string): Promise<GithubUser | null> {
  const res = await fetch(`${API_BASE}/user`, { headers: headers(token) });
  if (!res.ok) return null;
  const data = await res.json();
  return { login: data.login as string };
}

export interface GithubRepo {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
}

function slugifyRepoName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "shopify-app";
}

export async function ensureRepo(token: string, owner: string, desiredName: string): Promise<GithubRepo> {
  const repoName = slugifyRepoName(desiredName);

  const existing = await fetch(`${API_BASE}/repos/${owner}/${repoName}`, { headers: headers(token) });
  if (existing.ok) {
    const data = await existing.json();
    return { fullName: data.full_name, htmlUrl: data.html_url, defaultBranch: data.default_branch };
  }

  const created = await fetch(`${API_BASE}/user/repos`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name: repoName, private: true, auto_init: true }),
  });
  if (!created.ok) {
    const body = await created.text();
    throw new Error(`Failed to create GitHub repo "${repoName}": ${created.status} ${body}`);
  }
  const data = await created.json();
  return { fullName: data.full_name, htmlUrl: data.html_url, defaultBranch: data.default_branch };
}

export async function pushFiles(
  token: string,
  fullName: string,
  files: { path: string; content: string }[],
  commitMessage: string,
): Promise<{ pushed: number }> {
  let pushed = 0;
  for (const file of files) {
    const contentsUrl = `${API_BASE}/repos/${fullName}/contents/${file.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    const existing = await fetch(contentsUrl, { headers: headers(token) });
    const sha = existing.ok ? ((await existing.json()).sha as string) : undefined;

    const res = await fetch(contentsUrl, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(file.content, "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to push ${file.path}: ${res.status} ${body}`);
    }
    pushed += 1;
  }
  return { pushed };
}
