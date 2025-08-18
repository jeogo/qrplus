"use client"
// Phase 1 hook: manage notification permission + registration lifecycle (skeleton)
// Responsibilities (future phases):
// - Request browser permission
// - Acquire FCM token (via acquireFcmToken)
// - Register token with backend
// - Unregister on logout or disable

import { useCallback, useEffect, useRef, useState } from 'react'
import { acquireFcmToken } from '@/lib/firebase/messaging'

export type PushPermissionState = 'default' | 'granted' | 'denied'

interface UsePushPermissionsOptions {
  autoRegister?: boolean // attempt registration on mount if granted
  role?: string | null
  lang?: 'ar' | 'fr'
}

export function usePushPermissions(opts: UsePushPermissionsOptions = {}) {
  const { autoRegister = true, role = null, lang = 'ar' } = opts
  const [permission, setPermission] = useState<PushPermissionState>(typeof Notification !== 'undefined' ? Notification.permission as PushPermissionState : 'default')
  const [token, setToken] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const lastRegisteredToken = useRef<string | null>(null)

  // Reflect permission changes (some browsers allow event; fallback poll on focus)
  useEffect(() => {
    const onFocus = () => {
      if (typeof Notification !== 'undefined') {
        const p = Notification.permission as PushPermissionState
        setPermission(p)
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as PushPermissionState
    if (Notification.permission === 'granted') {
      setPermission('granted')
      return 'granted' as PushPermissionState
    }
    try {
      const res = await Notification.requestPermission()
      setPermission(res as PushPermissionState)
      return res as PushPermissionState
    } catch {
      setPermission('denied')
      return 'denied'
    }
  }, [])

  const registerToken = useCallback(async () => {
    if (permission !== 'granted') return null
    if (!role) return null
    setRegistering(true)
    try {
  const swReg = await navigator.serviceWorker.ready.catch(() => null as ServiceWorkerRegistration | null)
  const newToken = await acquireFcmToken({ serviceWorkerRegistration: swReg || undefined })
      if (!newToken) return null
      setToken(newToken)
      if (newToken !== lastRegisteredToken.current) {
        await fetch('/api/devices/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: newToken, role, lang }) })
        lastRegisteredToken.current = newToken
      }
      return newToken
    } finally {
      setRegistering(false)
    }
  }, [permission, role, lang])

  const unregisterToken = useCallback(async () => {
    if (!lastRegisteredToken.current) return
    try {
      await fetch('/api/devices/unregister', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: lastRegisteredToken.current }) })
    } catch { /* ignore */ }
    lastRegisteredToken.current = null
    setToken(null)
  }, [])

  useEffect(() => {
    if (autoRegister && permission === 'granted' && role) {
      void registerToken()
    }
  }, [autoRegister, permission, role, registerToken])

  return {
    permission,
    token,
    registering,
    requestPermission,
    registerToken,
    unregisterToken,
  }
}
