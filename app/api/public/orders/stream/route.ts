import { NextRequest } from 'next/server'
import admin from '@/lib/firebase/admin'

// SSE endpoint for public order status updates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderIdStr = searchParams.get('orderId')
    const orderId = Number(orderIdStr)

    // تحقق من رقم الطلب
    if (!orderIdStr || !Number.isInteger(orderId) || orderId <= 0) {
      return new Response('Invalid orderId', { status: 400 })
    }

    const db = admin.firestore()
    const orderRef = db.collection('orders').doc(String(orderId))

    interface PublicOrderDoc {
      id: number
      table_id: number
      status: string
      updated_at?: string
      last_status_at?: string
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder()
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(enc.encode(`event: ${event}\n`))
            controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch {}
        }
        const comment = (txt: string) => controller.enqueue(enc.encode(`: ${txt}\n\n`))

        let closed = false
        const close = () => {
          if (!closed) {
            closed = true
            try { controller.close() } catch {}
          }
        }

        // Heartbeat للحفاظ على الاتصال مفتوح
        const heartbeat = setInterval(() => comment(`hb ${Date.now()}`), 25000)

        // الاشتراك على تغييرات الطلب
        const unsub = orderRef.onSnapshot(
          snap => {
            if (!snap.exists) {
              send('deleted', { id: orderId })
              setTimeout(() => { clearInterval(heartbeat); unsub(); close() }, 150)
              return
            }
            const d = snap.data() as PublicOrderDoc
            send('status', {
              id: d.id,
              table_id: d.table_id,
              status: d.status,
              updated_at: d.updated_at,
              last_status_at: d.last_status_at
            })
          },
          err => {
            send('error', { message: err.message })
            setTimeout(() => { clearInterval(heartbeat); unsub(); close() }, 80)
          }
        )

        comment('connected')

        const signal = req.signal as AbortSignal
        if (signal.aborted) { clearInterval(heartbeat); unsub(); close(); return }
        signal.addEventListener('abort', () => { clearInterval(heartbeat); unsub(); close() }, { once: true })
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUBLIC][ORDER_SSE]', error)
    }
    return new Response('Server error', { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
