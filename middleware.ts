import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  // Auth page: redirect if already logged in
  if (pathname === '/auth' && role) {
    const url = req.nextUrl.clone()
    if (role === 'waiter') url.pathname = WAITER_PREFIX
    else if (role === 'kitchen') url.pathname = KITCHEN_PREFIX
    else url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  // Require auth for protected zones
  const protectedZones = [ADMIN_PREFIX, KITCHEN_PREFIX, WAITER_PREFIX]
  if (protectedZones.some(p => pathname.startsWith(p))) {
    if (!token || !role) {
      const url = req.nextUrl.clone(); url.pathname = '/auth'; return NextResponse.redirect(url)
    }
  }

  // Role enforcement
  if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
    const url = req.nextUrl.clone(); url.pathname = role === 'waiter' ? WAITER_PREFIX : role === 'kitchen' ? KITCHEN_PREFIX : '/auth'; return NextResponse.redirect(url)
  }
  if (pathname.startsWith(KITCHEN_PREFIX) && role !== 'kitchen') {
    const url = req.nextUrl.clone(); url.pathname = role === 'waiter' ? WAITER_PREFIX : role === 'admin' ? '/admin/dashboard' : '/auth'; return NextResponse.redirect(url)
  }
  if (pathname.startsWith(WAITER_PREFIX) && role !== 'waiter') {
    const url = req.nextUrl.clone(); url.pathname = role === 'kitchen' ? KITCHEN_PREFIX : role === 'admin' ? '/admin/dashboard' : '/auth'; return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/auth', '/kitchen', '/waiter']
}
