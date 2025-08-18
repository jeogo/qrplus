// Lightweight SSE helper for public order status
// Handles reconnection with exponential backoff and retry cap

export interface PublicOrderSSEOptions {
  orderId: number
  maxRetries?: number
  baseDelayMs?: number
  onStatus: (data: { id:number; table_id:number; status:string; updated_at?:string }) => void
  onDeleted: () => void
  onOpen?: () => void
  onFinalError?: (lastError: Event | undefined) => void
  onRetry?: (attempt:number, delayMs:number) => void
}

export interface PublicOrderSSEController { close: () => void }

export function connectPublicOrderStatus(opts: PublicOrderSSEOptions): PublicOrderSSEController {
  const { orderId } = opts
  const maxRetries = opts.maxRetries ?? 8
  const baseDelay = opts.baseDelayMs ?? 1000
  let attempt = 0
  let es: EventSource | null = null
  let closed = false
  let lastError: Event | undefined

  const open = () => {
    if (closed) return
    es = new EventSource(`/api/public/orders/stream?orderId=${orderId}`)
    es.addEventListener('open', () => { attempt = 0; opts.onOpen?.() })
    es.addEventListener('status', (ev) => {
      const data = safeParse(ev)
      if (data) opts.onStatus(data)
    })
    es.addEventListener('deleted', () => { opts.onDeleted(); internalClose() })
    es.onerror = (ev) => {
      lastError = ev
      if (closed) return
      es?.close(); es = null
      attempt += 1
      if (attempt > maxRetries) {
        opts.onFinalError?.(lastError)
        return
      }
      const delay = Math.min(15000, baseDelay * Math.pow(2, attempt - 1))
      opts.onRetry?.(attempt, delay)
      setTimeout(open, delay)
    }
  }

  const internalClose = () => { if (!closed) { closed = true; es?.close(); es = null } }
  open()
  return { close: internalClose }
}

function safeParse(ev: Event): { id:number; table_id:number; status:string; updated_at?:string } | null {
  try {
    const me = ev as MessageEvent
    const obj = JSON.parse(me.data)
    if (typeof obj === 'object' && obj && typeof obj.id === 'number') return obj
    return null
  } catch { return null }
}
