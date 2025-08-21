import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Basic security headers (CSP minimalist, can be expanded later)
function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-XSS-Protection', '0') // modern browsers rely on CSP

  // In development, Next.js (Turbopack + React Refresh) needs websockets + eval/inline allowances.
  // Overly strict CSP here was causing the RSC stream to terminate early ("Connection closed").
  // We loosen the policy only for dev; production policy can be hardened later with nonces.
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    // Allow ws: for HMR, 'unsafe-eval' for React Refresh, and blob: for potential asset workers.
    res.headers.set('Content-Security-Policy', [
      "default-src 'self' blob: data:",
      "img-src 'self' data: https:",
      "media-src 'self' data: https:",
      "connect-src 'self' ws: wss: http: https:",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
    ].join('; '))
  } else {
    // Production (still intentionally permissive; tighten with nonces/hashes later)
    res.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; media-src 'self' data: https:; connect-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;")
  }
  return res
}

const ADMIN_PREFIX = '/admin'
const KITCHEN_PREFIX = '/kitchen'
const WAITER_PREFIX = '/waiter'

interface DecodedToken { role?: string }

function decodeToken(token?: string): DecodedToken | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  return payload
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('auth_token')?.value
  const decoded = decodeToken(token)
  const role = decoded?.role

  // Auth page: redirect if already logged in (centralized mapping)
  if (pathname === '/auth' && role) {
    const target = role === 'waiter' ? WAITER_PREFIX : (role === 'kitchen' ? KITCHEN_PREFIX : '/admin/dashboard')
    const url = req.nextUrl.clone(); url.pathname = target
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Require auth for protected zones
  const protectedZones = [ADMIN_PREFIX, KITCHEN_PREFIX, WAITER_PREFIX]
  if (protectedZones.some(p => pathname.startsWith(p))) {
    if (!token || !role) {
      const url = req.nextUrl.clone(); url.pathname = '/auth'; return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  // Role enforcement (simple prefix policy – page-level, not API)
  if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
    const url = req.nextUrl.clone(); url.pathname = role === 'waiter' ? WAITER_PREFIX : role === 'kitchen' ? KITCHEN_PREFIX : '/auth'; return applySecurityHeaders(NextResponse.redirect(url))
  }
  if (pathname.startsWith(KITCHEN_PREFIX) && role !== 'kitchen') {
    const url = req.nextUrl.clone(); url.pathname = role === 'waiter' ? WAITER_PREFIX : role === 'admin' ? '/admin/dashboard' : '/auth'; return applySecurityHeaders(NextResponse.redirect(url))
  }
  if (pathname.startsWith(WAITER_PREFIX) && role !== 'waiter') {
    const url = req.nextUrl.clone(); url.pathname = role === 'kitchen' ? KITCHEN_PREFIX : role === 'admin' ? '/admin/dashboard' : '/auth'; return applySecurityHeaders(NextResponse.redirect(url))
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/admin/:path*', '/auth', '/kitchen', '/waiter']
}
