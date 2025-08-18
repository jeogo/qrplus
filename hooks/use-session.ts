"use client"
import { useEffect, useState } from 'react'
import { fetchSession, getCachedSession, hasAuthCookie, setCachedSession, SessionUser } from '@/lib/auth/session-client'

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!hasAuthCookie()) {
      setUser(null)
      setLoading(false)
      return () => { cancelled = true }
    }
    const existing = getCachedSession()
    if (existing) {
      setUser(existing)
      setLoading(false)
      return () => { cancelled = true }
    }
    setLoading(true)
    fetchSession().then(u => {
      if (cancelled) return
      setUser(u)
    }).catch(() => { if (!cancelled) setError('session_error') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const updateSession = (u: SessionUser | null) => {
    setCachedSession(u)
    setUser(u)
  }
  return { user, loading, error, updateSession }
}
