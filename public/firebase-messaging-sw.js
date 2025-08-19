
// v2 - explicit showNotification even when payload.notification exists
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// Hard-coded public config (safe: all are public keys) to avoid relying on unavailable env injection in SW
const firebaseConfig = {
  apiKey: 'AIzaSyBGj_suOom0BVqrgXab6w6rXBHrVueS3JU',
  authDomain: 'qrplus-edaa9.firebaseapp.com',
  projectId: 'qrplus-edaa9',
  storageBucket: 'qrplus-edaa9.appspot.com',
  messagingSenderId: '39680859158',
  appId: '1:39680859158:web:e534288133a1924d87e937',
  // measurementId optional
}

// Initialize (ignore errors silently for older browsers)
try { firebase.initializeApp(firebaseConfig); console.log('[SW][FCM] init ok') } catch (e) { console.log('[SW][FCM] init fail', e) }
let messaging = null
try { messaging = firebase.messaging(); console.log('[SW][FCM] messaging ready') } catch (e) { console.log('[SW][FCM] messaging fail', e) }

// In-memory recent map for dedupe (clears on SW restart)
const recent = new Map()
const DEDUPE_WINDOW_MS = 2000

function shouldSuppress(key) {
  const now = Date.now()
  const ts = recent.get(key)
  if (ts && now - ts < DEDUPE_WINDOW_MS) return true
  recent.set(key, now)
  return false
}

// Listen for BroadcastChannel hints from pages (future enhancement)
let bc
try {
  bc = new BroadcastChannel('notifications-sync')
  bc.onmessage = (evt) => {
    if (!evt || !evt.data) return
    const { key, ts } = evt.data || {}
    if (key && typeof ts === 'number') {
      recent.set(key, ts)
    }
  }
} catch { /* channel unsupported */ }

// Background handler (notification payload handled automatically)
if (messaging && messaging.onBackgroundMessage) {
  messaging.onBackgroundMessage(payload => {
    const data = payload?.data || {}
    const type = data.type
    const orderId = data.orderId
    const key = type && orderId ? `${type}:${orderId}` : null
    console.log('[SW][FCM] background message', { type, orderId, hasNotification: !!payload?.notification })
    if (key && shouldSuppress(key)) {
      console.log('[SW][FCM] suppressed (recent)', key)
      return
    }
    // If notification part present, most browsers auto-display; we can optionally re-show only if needed.
    let title = data.title || (type === 'order.new' ? 'طلب جديد' : type === 'order.ready' ? 'الطلب جاهز' : 'Order Update')
    let body = data.body || ''
    if (payload?.notification) {
      title = payload.notification.title || title
      body = payload.notification.body || body
    }
    const options = {
      body,
      data,
      tag: key || undefined,
      renotify: false,
      badge: '/icon-32x32.png',
      icon: '/icon-144x144.png'
    }
    self.registration.showNotification(title, options)
  })
}

// Fallback raw push listener (in case FCM SDK doesn't auto-handle)
self.addEventListener('push', (event) => {
  try {
    if (!event.data) return
    const data = event.data.json()
    // If already structured like an FCM message, adapt
    const fcm = data?.notification || null
    const d = data?.data || data || {}
    const type = d.type
    const orderId = d.orderId
    const key = type && orderId ? `${type}:${orderId}` : null
    if (key && shouldSuppress(key)) return
    const title = (fcm?.title) || (type === 'order.new' ? 'طلب جديد' : type === 'order.ready' ? 'الطلب جاهز' : 'Order Update')
    const body = (fcm?.body) || ''
    const options = {
      body,
      data: d,
      tag: key || undefined,
      badge: '/icon-32x32.png',
      icon: '/icon-144x144.png'
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    console.log('[SW][FCM][push-fallback][error]', e)
  }
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data || {}
  const role = data.role
  let url = '/admin/orders'
  if (role === 'kitchen') url = '/kitchen'
  else if (role === 'waiter') url = '/waiter'
  else if (role === 'client') {
    const tableId = data.tableId || data.table_id
    const accountId = data.account_id || data.accountId
    if (tableId && accountId) url = `/menu/${accountId}/${tableId}`
    else url = '/'
  }
  event.notification.close()
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of allClients) {
      if ('focus' in client) {
        client.navigate(url)
        return client.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})
