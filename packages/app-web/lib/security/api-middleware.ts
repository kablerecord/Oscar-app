import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { checkRateLimit, recordRequest } from './rate-limit'

/**
 * API Security Middleware
 *
 * Wraps API route handlers with:
 * 1. Authentication check
 * 2. Rate limiting
 * 3. Usage tracking
 * 4. Error handling
 */

export interface SecureRouteOptions {
  requireAuth?: boolean // Default: true
  endpoint: string // For rate limiting tracking
  tier?: string // User tier (pro/master/unlimited)
}

export interface AuthenticatedRequest extends NextRequest {
  userId: string
  userEmail: string
}

type RouteHandler = (
  req: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>

/**
 * Helper to extract IP from request
 */
function getClientIP(req: NextRequest): string {
  // Check various headers in order of preference
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback - in production this should always have a real IP
  return '127.0.0.1'
}

/**
 * Create a secure API route handler
 *
 * Usage:
 * ```typescript
 * export const POST = withSecurity(
 *   { endpoint: 'oscar/ask', requireAuth: true },
 *   async (req) => {
 *     // req.userId is guaranteed to exist
 *     const body = await req.json()
 *     // ... handle request
 *   }
 * )
 * ```
 */
export function withSecurity(options: SecureRouteOptions, handler: RouteHandler) {
  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    const { requireAuth = true, endpoint, tier = 'pro' } = options
    const ip = getClientIP(req)

    try {
      // 1. Authentication check
      let userId = 'anonymous'
      let userEmail = ''

      if (requireAuth) {
        const session = await getServerSession()

        if (!session?.user?.email) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Please sign in to continue' },
            { status: 401 }
          )
        }

        userId = (session.user as { id?: string }).id || session.user.email
        userEmail = session.user.email
      }

      // 2. Rate limit check
      const rateLimitResult = await checkRateLimit({
        userId,
        ip,
        endpoint,
        tier,
      })

      if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message:
              rateLimitResult.reason === 'daily_limit'
                ? "You've reached your daily limit. Upgrade to Pro for more requests."
                : 'Too many requests. Please slow down.',
            resetAt: rateLimitResult.resetAt.toISOString(),
            remaining: 0,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            },
          }
        )
      }

      // 3. Record the request (for usage tracking)
      await recordRequest({
        userId,
        ip,
        endpoint,
      })

      // 4. Execute the actual handler
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.userId = userId
      authenticatedReq.userEmail = userEmail

      const response = await handler(authenticatedReq, context)

      // Add rate limit headers to response
      const headers = new Headers(response.headers)
      headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString())

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)

      // Don't leak internal errors to client
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Something went wrong. Please try again.',
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Simple rate limit check for public endpoints (no auth required)
 * Tracks by IP only
 */
export async function checkPublicRateLimit(
  req: NextRequest,
  endpoint: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const ip = getClientIP(req)

  const result = await checkRateLimit({
    userId: 'anonymous',
    ip,
    endpoint,
    tier: 'pro',
  })

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please slow down.',
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      ),
    }
  }

  // Record the request
  await recordRequest({
    userId: 'anonymous',
    ip,
    endpoint,
  })

  return { allowed: true }
}
