const API_BASE = "https://api.github.com";

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
