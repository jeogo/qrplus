import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { nextSequence } from '@/lib/firebase/sequences'
import { mirrorOrderCreate } from '@/lib/mirror'
import { sendOrderNewPush } from '@/lib/notifications/push-sender'

// POST public order create
export async function POST(req: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const tableId = Number(params.tableId)
    if (!Number.isInteger(tableId)) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const itemsInput = Array.isArray(body.items) ? body.items : []
  const rawNote = typeof body.note === 'string' ? body.note : ''
  const note = rawNote.trim().slice(0, 300)
  const hasNote = note.length > 0
    if (!itemsInput.length || itemsInput.length > 40) return NextResponse.json({ success: false, error: 'INVALID_ITEMS' }, { status: 400 })

    // Normalize + validate items
    const normalized: { product_id: number; quantity: number }[] = []
    for (const raw of itemsInput) {
      const pid = Number(raw?.product_id)
      const qty = Number(raw?.quantity)
      if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0 || qty > 50) {
        return NextResponse.json({ success: false, error: 'INVALID_ITEMS' }, { status: 400 })
      }
      normalized.push({ product_id: pid, quantity: qty })
    }
    // Aggregate duplicates (sum quantities)
    const quantityMap = new Map<number, number>()
    for (const it of normalized) {
      quantityMap.set(it.product_id, (quantityMap.get(it.product_id) || 0) + it.quantity)
    }
    const uniqueItems = [...quantityMap.entries()].map(([product_id, quantity]) => ({ product_id, quantity }))

    const db = admin.firestore()
    // Table lookup
    const tableSnap = await db.collection('tables').doc(String(tableId)).get()
    if (!tableSnap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    const tableData = tableSnap.data()!
    const accountId = tableData.account_id
    // Check system active (account active flag)
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists || accountSnap.data()?.active === false) {
      return NextResponse.json({ success: false, error: 'SYSTEM_INACTIVE' }, { status: 423 })
    }

    // Enforce single active order (pending/approved/ready)
    const activeSnap = await db.collection('orders')
      .where('account_id','==',accountId)
      .where('table_id','==',tableId)
      .where('status','in',['pending','approved','ready'])
      .limit(1)
      .get()
    if (!activeSnap.empty) {
      const existing = activeSnap.docs[0].data()
      return NextResponse.json({ success:false, error:'ACTIVE_ORDER_EXISTS', data:{ order_id: existing.id } }, { status: 409 })
    }

    // Fetch products
    const productIds = uniqueItems.map(i => i.product_id)
    const prodSnap = await db.collection('products').where('id','in',productIds).get()
    const prodMap = new Map<number, FirebaseFirestore.DocumentData>()
    prodSnap.docs.forEach(d => { const data = d.data(); if (data.account_id === accountId && data.available === true) prodMap.set(data.id, data) })
    if (prodMap.size !== productIds.length) return NextResponse.json({ success: false, error: 'PRODUCT_NOT_FOUND' }, { status: 400 })

    // Build order + items
    const now = new Date().toISOString()
    let total = 0
    const itemsToStore: { product_id:number; product_name:string; quantity:number; price:number }[] = []
    for (const it of uniqueItems) {
      const prod = prodMap.get(it.product_id)!
      const price = Number(prod.price)
      total += price * it.quantity
      if (total > 1_000_000) return NextResponse.json({ success: false, error: 'TOTAL_LIMIT' }, { status: 400 })
      itemsToStore.push({ product_id: it.product_id, product_name: prod.name, quantity: it.quantity, price })
    }

  const orderId = await nextSequence('orders')
    const batch = db.batch()
  // Explicit inline type (no 'any') to satisfy linter
  const orderDoc: { id:number; account_id:number; table_id:number; status:'pending'; total:number; created_at:string; updated_at:string; last_status_at:string; note?:string } = { id: orderId, account_id: accountId, table_id: tableId, status: 'pending', total, created_at: now, updated_at: now, last_status_at: now }
  if (hasNote) orderDoc.note = note
    batch.set(db.collection('orders').doc(String(orderId)), orderDoc)
    for (const it of itemsToStore) {
      const itemId = await nextSequence('order_items')
      const itemDoc = { id: itemId, order_id: orderId, product_id: it.product_id, product_name: it.product_name, quantity: it.quantity, price: it.price, created_at: now, updated_at: now }
      batch.set(db.collection('order_items').doc(String(itemId)), itemDoc)
    }
  await batch.commit()

  await mirrorOrderCreate(accountId, hasNote ? { id: orderId, table_id: tableId, status: 'pending', total, created_at: now, updated_at: now, last_status_at: now, note } : { id: orderId, table_id: tableId, status: 'pending', total, created_at: now, updated_at: now, last_status_at: now })

  // Fire push (admin + kitchen) asynchronously
  sendOrderNewPush({ id: orderId, table_id: tableId, daily_number: undefined, account_id: accountId }).catch(e=>console.error('[PUSH][PUBLIC_ORDER_NEW]', e))

  return NextResponse.json({ success: true, data: { order: orderDoc, items: itemsToStore } }, { status: 201 })
  } catch (err) {
    console.error('[PUBLIC][ORDER_CREATE]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
