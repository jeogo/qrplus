// Client-side Firebase Cloud Messaging initialization (Phase 1)
// Provides: getOrRequestPermission + obtain FCM token using VAPID key
// NOTE: Actual push event handling (foreground) will happen via onMessage listener (optional later)

import { getApps } from 'firebase/app'
import app from './config'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

let messaging: Messaging | null = null

export function getMessagingInstance() {
  if (typeof window === 'undefined') return null
  if (!getApps().length) return null // should already be initialized in config
  if (!messaging) {
    try {
      messaging = getMessaging(app)
    } catch (e) {
      console.warn('[FCM] Failed to init messaging', e)
      return null
    }
  }
  return messaging
}

interface AcquireTokenOptions {
  vapidKey?: string
  serviceWorkerRegistration?: ServiceWorkerRegistration
}

export async function acquireFcmToken(opts: AcquireTokenOptions = {}) {
  if (typeof window === 'undefined') return null
  const m = getMessagingInstance()
  if (!m) return null
  try {
    const vapidKey = opts.vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('[FCM] Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY')
      return null
    }
    let swr = opts.serviceWorkerRegistration
    if (!swr && 'serviceWorker' in navigator) {
      // Try to get specific messaging SW then fall back to ready
      swr = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js').catch(() => undefined)
      // If not found, try to register it explicitly (helps first-load race conditions)
      if (!swr) {
        try {
          swr = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        } catch (e) {
          console.warn('[FCM] SW register attempt failed (will fallback to ready)', e)
        }
      }
      // Final fallback to any ready registration
      if (!swr) {
        try { swr = await navigator.serviceWorker.ready } catch { /* ignore */ }
      }
    }
    // Build options without undefined serviceWorkerRegistration to avoid internal pushManager access on undefined
    const tokenOptions: Record<string, unknown> = { vapidKey }
    if (swr) tokenOptions.serviceWorkerRegistration = swr
    const token = await getToken(m, tokenOptions as { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration })
    return token || null
  } catch (err: unknown) {
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : undefined
    if (code === 'messaging/permission-blocked') {
      console.log('[FCM] Permission blocked')
    } else {
      console.log('[FCM] getToken error', err)
    }
    return null
  }
}

export function listenForegroundMessages(cb: (payload: unknown)=>void) {
  const m = getMessagingInstance()
  if (!m) return () => {}
  const unsub = onMessage(m, (payload) => {
    cb(payload)
  })
  return unsub
}
