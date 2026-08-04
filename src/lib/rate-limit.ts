const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (attempts.size > 10_000) {
    for (const [k, timestamps] of attempts) {
      if (timestamps.every((t) => now - t >= windowMs)) attempts.delete(k);
    }
  }

  const timestamps = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    attempts.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  attempts.set(key, timestamps);
  return false;
}
