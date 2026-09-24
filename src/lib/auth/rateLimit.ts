/** In-memory sliding-window limiter for login attempts (per process). */
const attempts = new Map<string, number[]>();

export function tooManyAttempts(
  key: string,
  max = 10,
  windowMs = 15 * 60_000,
  now = Date.now(),
): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > max;
}
