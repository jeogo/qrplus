import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, onValue, off } from 'firebase/database'

// Only RTDB needed for public order status.
// Expect env public vars (NEXT_PUBLIC_*) to be configured.
// Normalize databaseURL to correct region if misconfigured (common warning fix)
function resolveDatabaseURL(raw?: string) {
  if (!raw) return undefined as unknown as string
  // Example warning: suggests europe-west1 firebasedatabase.app domain
  if (raw.includes('firebasedatabase.app')) return raw
  if (raw.includes('firebaseio.com')) {
    // Attempt heuristic replacement preserving instance prefix
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      const host = u.host // e.g. qrplus-edaa9-default-rtdb.firebaseio.com
      if (host.endsWith('firebaseio.com')) {
        const prefix = host.replace(/\.firebaseio\.com$/, '')
        return `https://${prefix}.europe-west1.firebasedatabase.app`
      }
    } catch { /* ignore */ }
  }
  return raw
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: resolveDatabaseURL(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

export function getClientApp() {
  if (!getApps().length) {
    initializeApp(firebaseConfig)
  }
  return getApps()[0]!
}

export function subscribeOrder(accountId:number, tableId:number, cb:(data:{ active_order_id?:number|null })=>void) {
  const app = getClientApp()
  const db = getDatabase(app)
  const r = ref(db, `accounts/${accountId}/tables/${tableId}`)
  const handler = (snap:import('firebase/database').DataSnapshot) => {
    cb((snap.val()||{}) as { active_order_id?:number|null })
  }
  onValue(r, handler)
  return () => off(r, 'value', handler)
}

export function subscribeOrderStatus(accountId:number, orderId:number, cb:(data:unknown)=>void) {
  const app = getClientApp()
  const db = getDatabase(app)
  const r = ref(db, `accounts/${accountId}/orders/${orderId}`)
  const handler = (snap:import('firebase/database').DataSnapshot) => cb(snap.val())
  onValue(r, handler)
  return () => off(r, 'value', handler)
}
