import { NextRequest } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

// SSE stream for internal (kitchen/admin) orders updates
export async function GET(req: NextRequest) {
  try {
    const sess = await requireSession().catch(()=>null)
    if(!sess){
      return new Response('Unauthorized',{ status:401 })
    }
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if(!Number.isFinite(accountId)) return new Response('Account missing',{ status:400 })

  // role param reserved for future filtering logic (removed to avoid unused var warning)

    const db = admin.firestore()
    const ordersCol = db.collection('orders').where('account_id','==',accountId)

    interface OrderDoc {
      id: number
      table_id: number
      status: string
      total?: number
      updated_at?: string | FirebaseFirestore.Timestamp
      last_status_at?: string | FirebaseFirestore.Timestamp
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller){
        const enc = new TextEncoder()
        const send = (event:string,data:unknown)=>{
          try{
            controller.enqueue(enc.encode(`event: ${event}\n`))
            controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
          }catch{}
        }
        const comment = (txt:string)=> controller.enqueue(enc.encode(`: ${txt}\n\n`))
        let closed=false
        const close=()=>{ if(!closed){ closed=true; try{ controller.close() }catch{} } }

        const heartbeat = setInterval(()=> comment('hb '+Date.now()),25000)

        const unsub = ordersCol.onSnapshot(async snap=>{
          for (const ch of snap.docChanges()) {
            try {
              const raw = ch.doc.data() as OrderDoc
              const base = {
                id: raw.id,
                table_id: raw.table_id,
                status: raw.status,
                total: Number(raw.total)||0,
                updated_at: raw.updated_at,
                last_status_at: raw.last_status_at
              }
              if(ch.type==='added') {
                // fetch items for new order
                const itemsSnap = await admin.firestore().collection('order_items').where('order_id','==',raw.id).get()
                const items = itemsSnap.docs.map(d=> d.data())
                send('created',{ order: base, items })
              } else if(ch.type==='modified') {
                send('updated',{ order: base })
              } else if(ch.type==='removed') {
                send('deleted',{ id: raw.id })
              }
            } catch { /* ignore per change */ }
          }
        },err=>{
          send('error',{ message: err.message })
          setTimeout(()=>{ clearInterval(heartbeat); unsub(); close() },80)
        })

        comment('connected')
        const signal = req.signal as AbortSignal
        if(signal.aborted){ clearInterval(heartbeat); unsub(); close(); return }
        signal.addEventListener('abort',()=>{ clearInterval(heartbeat); unsub(); close() }, { once:true })
      }
    })

    return new Response(stream,{
      status:200,
      headers:{
        'Content-Type':'text/event-stream; charset=utf-8',
        'Cache-Control':'no-cache, no-transform',
        'Connection':'keep-alive',
        'X-Accel-Buffering':'no'
      }
    })
  } catch (e) {
    if(process.env.NODE_ENV!=='production') console.error('[ORDERS][STREAM]',e)
    return new Response('Server error',{ status:500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
