// lib/rate-limit.ts
// Simple in-memory per-IP rate limiter. WHY: protects the LLM-backed
// /api/chat route from abuse without adding Redis for a prototype.

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export function rateLimitResponse() {
  return Response.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Try again soon." } },
    { status: 429 }
  );
}
