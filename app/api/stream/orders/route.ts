import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// SSE stream of orders changes for an account
export async function GET(req: NextRequest) {
  const sess = requireSession()
  const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') || ''

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const startedAt = Date.now()
  function send(ev: string, data: unknown) {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${ev}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      function ping() { send('ping', { t: Date.now() }) }

      const db = admin.firestore()
      let query: FirebaseFirestore.Query = db.collection('orders').where('account_id','==',accountId)
      // Use snapshot listener with limit for initial load + live updates
      query = query.orderBy('created_at','desc').limit(200)

  const unsub = query.onSnapshot(snap => {
        snap.docChanges().forEach(ch => {
          const data = ch.doc.data()
          // Skip served orders (auto-archived or pending archival) unless explicitly requested via status filter
            if (!statusFilter && data.status === 'served') return
          if (statusFilter && data.status !== statusFilter) return
          const base = { id:data.id, table_id:data.table_id, status:data.status, total:data.total, created_at:data.created_at, updated_at:data.updated_at, last_status_at:data.last_status_at, daily_number: data.daily_number }
          if (ch.type === 'added') {
            console.log(`[SSE] Order created: ${data.id}`)
            send('order.created', base)
          } else if (ch.type === 'modified') {
            console.log(`[SSE] Order updated: ${data.id} → ${data.status}`)
            send('order.updated', base)
          } else if (ch.type === 'removed') {
            console.log(`[SSE] Order deleted: ${data.id}`)
            send('order.deleted', { id:data.id, table_id:data.table_id })
          }
        })
      }, err => {
        console.error('[SSE] Firestore listener error:', err)
        send('error', { message: 'listener_error', detail: String(err) })
      })

      const pingInterval = setInterval(ping, 25000)
      ping()

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(pingInterval)
        unsub()
        try { send('end', { uptimeMs: Date.now() - startedAt }) } catch {}
        controller.close()
      }
      // Abort handling
      const abort = req.signal
      if (abort.aborted) close()
      abort.addEventListener('abort', close)
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Pragma': 'no-cache'
    }
  })
}
