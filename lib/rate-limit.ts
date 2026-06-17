/**
 * Lightweight in-process rate limiter using a sliding window.
 * Keyed by IP. No external dependency.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function rateLimit(
  ip: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = windows.get(ip);

  if (!existing || now > existing.resetAt) {
    windows.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  existing.count++;
  const remaining = Math.max(0, limit - existing.count);
  return { allowed: existing.count <= limit, remaining };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
