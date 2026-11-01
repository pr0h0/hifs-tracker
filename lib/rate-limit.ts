// Failed-attempt limiter for login.
// ponytail: in-memory, per server process, so it resets on restart. Move it into SQLite if you run several instances.
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function isLimited(key: string, limit: number, now = Date.now()) {
  const f = failures.get(key);
  return !!f && f.resetAt > now && f.count >= limit;
}

export function recordFailure(key: string, now = Date.now()) {
  if (failures.size > 10_000) {
    for (const [k, v] of failures) if (v.resetAt <= now) failures.delete(k);
  }
  const f = failures.get(key);
  if (!f || f.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else f.count++;
}

export function clearFailures(key: string) {
  failures.delete(key);
}
