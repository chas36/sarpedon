/**
 * Rate Limiting Middleware for Edge Functions
 *
 * Uses Upstash Redis for distributed rate limiting
 * Falls back to in-memory (for dev) if Redis not configured
 *
 * Security: CRITICAL-006 remediation
 */

// Simple in-memory rate limiter (fallback for dev)
class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>();

  async limit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const data = this.requests.get(identifier);

    // Clean up expired entries
    if (data && now > data.resetAt) {
      this.requests.delete(identifier);
    }

    const current = this.requests.get(identifier);

    if (!current) {
      // First request in this window
      this.requests.set(identifier, { count: 1, resetAt: now + windowMs });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }

    if (current.count >= maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: current.resetAt,
      };
    }

    // Increment counter
    current.count++;
    this.requests.set(identifier, current);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - current.count,
      reset: current.resetAt,
    };
  }
}

// Singleton instance
const inMemoryLimiter = new InMemoryRateLimiter();

/**
 * Rate limit configuration by endpoint
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * Default rate limits for different endpoint types
 */
export const RATE_LIMITS = {
  // Expensive operations (AI, create/delete users)
  STRICT: { maxRequests: 5, windowSeconds: 60 },      // 5 per minute

  // Normal operations (CRUD)
  NORMAL: { maxRequests: 20, windowSeconds: 60 },     // 20 per minute

  // Read-only operations
  PERMISSIVE: { maxRequests: 60, windowSeconds: 60 }, // 60 per minute
} as const;

/**
 * Check rate limit for a request
 *
 * @param req - The incoming request
 * @param config - Rate limit configuration
 * @returns Response with 429 if rate limited, null if allowed
 */
export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig = RATE_LIMITS.NORMAL
): Promise<Response | null> {
  try {
    // Get identifier (IP address or user ID from auth header)
    const identifier = getIdentifier(req);

    // Try Upstash Redis first (production)
    if (Deno.env.get('UPSTASH_REDIS_REST_URL') && Deno.env.get('UPSTASH_REDIS_REST_TOKEN')) {
      return await checkRateLimitWithUpstash(identifier, config);
    }

    // Fallback to in-memory (development)
    console.warn('⚠️  UPSTASH_REDIS not configured, using in-memory rate limiter (dev only!)');
    return await checkRateLimitInMemory(identifier, config);

  } catch (error) {
    // Log error but don't block request (fail open)
    console.error('❌ Rate limit check failed:', error);
    return null;
  }
}

/**
 * Get unique identifier for rate limiting
 */
function getIdentifier(req: Request): string {
  // Try to get IP address
  const ip = req.headers.get('x-forwarded-for') ||
             req.headers.get('x-real-ip') ||
             'unknown';

  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    try {
      // Extract JWT payload (basic parsing, not verification)
      const token = authHeader.replace('Bearer ', '');
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.sub) {
          // Use user ID if authenticated
          return `user:${payload.sub}`;
        }
      }
    } catch {
      // If JWT parsing fails, fall back to IP
    }
  }

  // Use IP address for unauthenticated requests
  return `ip:${ip}`;
}

/**
 * Check rate limit using Upstash Redis
 */
async function checkRateLimitWithUpstash(
  identifier: string,
  config: RateLimitConfig
): Promise<Response | null> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')!;
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!;

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // Use Redis commands via REST API
  // INCR key, EXPIRE if first request
  const incrResponse = await fetch(`${url}/incr/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!incrResponse.ok) {
    throw new Error('Redis INCR failed');
  }

  const { result: count } = await incrResponse.json();

  // Set expiry if this is the first request
  if (count === 1) {
    await fetch(`${url}/expire/${key}/${config.windowSeconds}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  const remaining = Math.max(0, config.maxRequests - count);
  const success = count <= config.maxRequests;

  if (!success) {
    // Get TTL for reset time
    const ttlResponse = await fetch(`${url}/ttl/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { result: ttl } = await ttlResponse.json();
    const resetAt = now + (ttl * 1000);

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString(),
          'Retry-After': ttl.toString(),
        },
      }
    );
  }

  return null; // Allow request
}

/**
 * Check rate limit using in-memory storage (dev only)
 */
async function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): Promise<Response | null> {
  const result = await inMemoryLimiter.limit(
    identifier,
    config.maxRequests,
    config.windowSeconds * 1000
  );

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  return null; // Allow request
}
