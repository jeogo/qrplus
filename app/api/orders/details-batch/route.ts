import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'

// POST /api/orders/details-batch  Body: { ids:number[] }
export async function POST(req: NextRequest) {
  try {
  const sess = await requirePermission('orders.details','read')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success:false, error:'Account missing' }, { status:400 })
    const body = await req.json()
    const idsRaw = Array.isArray(body.ids) ? body.ids : []
  const ids = idsRaw.map((v: unknown)=> Number(v)).filter((v: number)=> Number.isInteger(v) && v>0)
    if (!ids.length) return NextResponse.json({ success:false, error:'NO_IDS' }, { status:400 })
    const limited = ids.slice(0,100)
    const db = admin.firestore()
  interface ItemDoc { id:number; order_id:number; product_id:number; product_name?:string; quantity:number; price:number; created_at?:string; updated_at?:string }
  const result: Record<number,{ items:ItemDoc[]; note?:string }> = {}
  await Promise.all(limited.map(async (oid: number) => {
      const orderRef = db.collection('orders').doc(String(oid))
      const oSnap = await orderRef.get()
      if (!oSnap.exists) return
      const oData = oSnap.data()!
      if (oData.account_id !== accountId) return
      const itemsSnap = await db.collection('order_items').where('order_id','==', oid).get()
      type RawItem = Partial<ItemDoc> & { created_at?: unknown; updated_at?: unknown }
      const items: ItemDoc[] = itemsSnap.docs.map(d => {
        const it = d.data() as RawItem
        return {
          id: Number(it.id),
          order_id: Number(it.order_id),
          product_id: Number(it.product_id),
          product_name: typeof it.product_name === 'string' ? it.product_name : undefined,
          quantity: Number(it.quantity),
          price: Number(it.price),
          created_at: typeof it.created_at === 'string' ? it.created_at : undefined,
          updated_at: typeof it.updated_at === 'string' ? it.updated_at : undefined,
        }
      })
      result[oid] = { items, note: oData.note }
    }))
    return NextResponse.json({ success:true, data:{ orders: result } })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[BATCH_DETAILS] error', err)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}


