// Minimal In-Memory Rate Limiter for Next.js API Routes / Server Actions
// In a true multi-instance serverless environment, this should be backed by Redis or Supabase RPC.
// However, for single-region Vercel functions, this works perfectly to stop basic brute forcing.

interface RateLimitTracker {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitTracker>();

// Default: Max 5 actions per 60 seconds per IP
export function rateLimit(identifier: string, limit: number = 5, windowMs: number = 60000): { success: boolean; resetTime: number } {
    const now = Date.now();
    const record = store.get(identifier);

    if (!record) {
        store.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return { success: true, resetTime: now + windowMs };
    }

    // Time window expired, reset count
    if (now > record.resetTime) {
        store.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return { success: true, resetTime: now + windowMs };
    }

    // Inside window, check limit
    if (record.count >= limit) {
        return { success: false, resetTime: record.resetTime };
    }

    // Allowed, increment count
    record.count += 1;
    return { success: true, resetTime: record.resetTime };
}
