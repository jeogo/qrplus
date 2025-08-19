// Client-side session helper with cookie gate + in-memory cache to avoid unnecessary /api/auth/me calls.
export interface SessionUser {
  sub: string
  email: string
  accountId: string
  accountNumericId?: number
  role: string
  username?: string
}

const SESSION_TTL_MS = 60_000 // 60s cache
let cachedUser: SessionUser | null = null
let cachedAt = 0
let inFlight: Promise<SessionUser | null> | null = null

// IMPORTANT: auth_token is httpOnly so it will NOT appear in document.cookie.
// Previous implementation incorrectly relied on client-side visibility causing false negatives
// and blocking session fetch on protected pages -> pages stuck on loading state.
// We now perform a network probe to /api/auth/me unconditionally (debounced by inFlight + cache).
// hasAuthCookie retained for backward compatibility but now only gives a soft hint (always true if in browser).
export function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  // We cannot detect httpOnly cookie; return true to allow fetchSession to proceed.
  return true
}

export function getCachedSession(): SessionUser | null {
  if (!cachedUser) return null
  if (Date.now() - cachedAt > SESSION_TTL_MS) return null
  return cachedUser
}

export function setCachedSession(user: SessionUser | null) {
  cachedUser = user
  cachedAt = Date.now()
}

export function invalidateSessionCache() {
  cachedUser = null
  cachedAt = 0
}

export function fetchSession(): Promise<SessionUser | null> {
  // Skip probing on clearly public pages to avoid 401 noise (auth, public menu)
  if (typeof window !== 'undefined') {
    const p = window.location.pathname
    const isPublic = p.startsWith('/auth') || p.startsWith('/menu') || p.startsWith('/api/public')
    if (isPublic) return Promise.resolve(null)
  }
  const existing = getCachedSession()
  if (existing) return Promise.resolve(existing)
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!res.ok) { setCachedSession(null); return null }
      const json = await res.json()
      if (json.success && json.user) {
        setCachedSession(json.user as SessionUser)
        return cachedUser
      }
      setCachedSession(null)
      return null
  } catch {
      // Network or parsing error – leave cached session as null
      setCachedSession(null)
      return null
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}
