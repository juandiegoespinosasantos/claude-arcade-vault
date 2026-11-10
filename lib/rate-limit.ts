// In-memory sliding-window limiter. Per server instance: it resets on restart
// and is not shared across serverless instances (accepted in SPEC 03).

export const CONTACT_RATE = { max: 3, windowMs: 10 * 60 * 1000 } as const;

const hits = new Map<string, number[]>();

/** Registers a hit for `key`. Returns false when the key is over the limit. */
export function rateLimit(
  key: string,
  max: number = CONTACT_RATE.max,
  windowMs: number = CONTACT_RATE.windowMs,
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 1000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}
