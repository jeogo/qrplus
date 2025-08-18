// Simple order tracking utility for persistent cart and order state
export const OrderTracking = {
  // Save active order ID for a table
  save: (tableId: string, orderId: number) => {
    try {
      localStorage.setItem(`active_order_${tableId}`, String(orderId))
    } catch {
      // localStorage not available
    }
  },
  
  // Load active order ID for a table
  load: (tableId: string): number | null => {
    try {
      const saved = localStorage.getItem(`active_order_${tableId}`)
      return saved ? Number(saved) : null
    } catch {
      return null
    }
  },
  
  // Clear active order ID for a table
  clear: (tableId: string) => {
    try {
      localStorage.removeItem(`active_order_${tableId}`)
    } catch {
      // localStorage not available
    }
  },
  
  // Fetch order details from API
  fetch: async (orderId: number) => {
    // Throttle & de-duplicate rapid calls (avoid flooding server)
    try {
      const now = Date.now()
      const cacheKey = `__ot_fetch_${orderId}`
      // simple in-memory (per-page) cache stored on window to persist across module reloads in dev
  interface CacheEntry { ts: number; promise: Promise<unknown> }
  type CacheContainer = { [k: string]: CacheEntry }
  const root: { __OT_FETCH_CACHE?: CacheContainer } = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : (globalThis as unknown as Record<string, unknown>))
  if (!root.__OT_FETCH_CACHE) root.__OT_FETCH_CACHE = {}
  const entry = root.__OT_FETCH_CACHE[cacheKey]
      if (entry && (now - entry.ts) < 5000) { // 5s throttle window
        return entry.promise
      }
      const controller = new AbortController()
      const timeout = setTimeout(()=>controller.abort(), 8000)
      const promise = fetch(`/api/public/orders/${orderId}`, { signal: controller.signal })
        .then(res => res.ok ? res.json() : null)
        .catch(()=>null)
        .finally(()=> clearTimeout(timeout))
  root.__OT_FETCH_CACHE[cacheKey] = { ts: now, promise }
      return await promise
    } catch {
      return null
    }
  },

  // Save cart items for a table
  saveCart: (tableId: string, items: unknown[]) => {
    try {
      localStorage.setItem(`qr_cart_${tableId}`, JSON.stringify(items))
    } catch {
      // localStorage not available
    }
  },

  // Load cart items for a table
  loadCart: (tableId: string): unknown[] => {
    try {
      const saved = localStorage.getItem(`qr_cart_${tableId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch {
      // Invalid JSON or localStorage not available
    }
    return []
  },

  // Clear cart for a table
  clearCart: (tableId: string) => {
    try {
      localStorage.removeItem(`qr_cart_${tableId}`)
    } catch {
      // localStorage not available
    }
  }
}
