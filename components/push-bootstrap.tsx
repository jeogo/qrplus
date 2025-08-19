"use client"
import { useEffect } from 'react'
import { useSession } from '@/hooks/use-session'
import { usePushPermissions } from '@/hooks/use-push-permissions'
import { listenForegroundMessages } from '@/lib/firebase/messaging'

export function PushBootstrap() {
  const { user } = useSession()
  const { permission, requestPermission, registerToken, token } = usePushPermissions({ autoRegister: false, role: user?.role || null, lang: (typeof window !== 'undefined' ? (localStorage.getItem('admin-language') as 'ar'|'fr'|null) : null) || 'ar' })

  useEffect(() => {
    if (!user) return
    if (permission === 'default') {
      requestPermission().then(p => { if (p === 'granted') registerToken() })
      return
    }
    if (permission === 'granted') {
      registerToken()
    }
  }, [user, permission, requestPermission, registerToken])

  useEffect(() => {
    if (token) {
      console.log('[PUSH][Client] token acquired', token.slice(0, 12) + '...')
    }
  }, [token])

  // Foreground message -> show OS notification manually (for data-only messages)
  useEffect(() => {
    if (!user) return
    if (Notification.permission !== 'granted') return
    const dedupe = new Map<string, number>()
    const DEDUPE_MS = 2000
    interface FcmForegroundPayload { data?: Record<string, unknown>; notification?: { title?: string; body?: string } }
    const unsub = listenForegroundMessages((payload: unknown) => {
      const p = payload as FcmForegroundPayload
      try {
        const data = p?.data || {}
        const type = data.type
        const orderId = data.orderId
        if (!type || !orderId) return
        const key = type + ':' + orderId
        const now = Date.now()
        const last = dedupe.get(key) || 0
        if (now - last < DEDUPE_MS) return
        dedupe.set(key, now)
        const title = (p?.notification?.title) || (
          type === 'order.new' ? 'طلب جديد' :
          type === 'order.approved' ? 'تم اعتماد الطلب' :
          type === 'order.ready' ? 'الطلب جاهز' :
          type === 'order.served' ? 'تم تقديم الطلب' :
          type === 'order.cancelled' ? 'تم إلغاء الطلب' : 'تحديث الطلب'
        )
        const body = (p?.notification?.body) || ''
        // Prefer SW registration for consistent icons
        navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js').then(reg => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, {
              body,
              data,
              tag: key,
              badge: '/icon-32x32.png',
              icon: '/icon-144x144.png'
            })
          } else {
            new Notification(title, { body, data })
          }
        }).catch(()=>{})
        // If client role, optionally redirect user to their table page when ready/served (in foreground)
        if (data.role === 'client' && (type === 'order.ready' || type === 'order.served')) {
          const tableId = data.tableId || data.table_id
          const accountId = data.account_id || data.accountId
          if (tableId && typeof window !== 'undefined' && accountId) {
            const target = `/menu/${accountId}/${tableId}`
            if (!window.location.pathname.startsWith(target)) {
              window.location.href = target
            }
          }
        }
      } catch {/* ignore */}
    })
  return () => { try { if (unsub) unsub() } catch { /* ignore */ } }
  }, [user])

  return null
}
