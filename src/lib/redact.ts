/**
 * Replaces any occurrence of a known secret value with a placeholder before text is stored or
 * returned to a client — defense in depth alongside not putting secrets in places (like CLI argv)
 * that would echo them into error messages in the first place. `undefined`/short values are
 * skipped so this can't accidentally redact ordinary short text that happens to match a
 * near-empty "secret".
 */
export function redactSecrets(text: string, secrets: (string | undefined | null)[]): string {
  let result = text;
  for (const secret of secrets) {
    if (!secret || secret.length < 6) continue;
    result = result.split(secret).join("[REDACTED]");
  }
  return result;
}
