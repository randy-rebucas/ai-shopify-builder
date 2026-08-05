// Generated file `path` values come from the AI (shaped by user chat input, i.e. effectively
// untrusted — prompt injection is a real concern) and get consumed by several downstream
// filesystem/API operations: materialize() writes them to disk before deploy and before mounting
// into the terminal Docker sandbox, the zip-download route packs them into an archive a user later
// extracts on their own machine, and the GitHub push writes them into a real repo via the user's
// OAuth token. None of those consumers should trust a path containing traversal segments, an
// absolute path, or (for GitHub specifically) a path that could inject CI config.

/**
 * True if `filePath` is safe to treat as a path relative to some destination root — no `..`
 * traversal segments, not absolute (POSIX `/...` or Windows `C:\...`/`\...`), no null bytes or
 * backslashes (normalize to forward slashes only), and non-empty.
 */
export function isSafeRelativePath(filePath: string): boolean {
  if (!filePath || filePath.includes("\0")) return false;
  if (filePath.includes("\\")) return false;
  if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) return false;
  const segments = filePath.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

/** Blocks pushing into `.github/` (workflow injection risk) — checked separately from general path safety. */
export function isUnderGithubDir(filePath: string): boolean {
  const first = filePath.split("/")[0];
  return first.toLowerCase() === ".github";
}

/**
 * Filters a generated-file list down to entries with safe paths, degrading rather than failing
 * the whole operation for one bad entry (consistent with this codebase's general philosophy of
 * not letting untrusted AI output crash things it merely brushes against). Returns the rejected
 * paths too, so callers can log/surface what got dropped.
 */
export function filterSafeGeneratedFiles<T extends { path: string }>(
  files: T[],
  extraCheck?: (filePath: string) => boolean,
): { safe: T[]; rejected: string[] } {
  const safe: T[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (isSafeRelativePath(file.path) && (!extraCheck || extraCheck(file.path))) {
      safe.push(file);
    } else {
      rejected.push(file.path);
    }
  }
  return { safe, rejected };
}
