import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'
import { nextDailySequence, getUtcDateKey } from '@/lib/orders/daily-sequence'
import { sendOrderNewPush } from '@/lib/notifications/push-sender'

// GET /api/orders?status=&table_id=
export async function GET(req: NextRequest) {
  try {
    const sess = await requireSession()
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const tableIdRaw = searchParams.get('table_id')
    const db = admin.firestore()
    let q: FirebaseFirestore.Query = db.collection('orders').where('account_id', '==', accountId)
    if (status) q = q.where('status', '==', status)
    if (tableIdRaw) {
      const tid = Number(tableIdRaw)
      if (Number.isInteger(tid)) q = q.where('table_id', '==', tid)
    }
    q = q.orderBy('created_at', 'desc')
    const snap = await q.get()
  interface OrderFirestoreDoc { [k:string]: unknown; created_at?: unknown; updated_at?: unknown; total?: unknown }
  interface FirestoreTimestampLike { toDate?: () => Date; seconds?: number; nanoseconds?: number }
    const data = snap.docs.map(d => {
      const raw = d.data() as OrderFirestoreDoc
      const tsCreated = raw.created_at
      const tsUpdated = raw.updated_at
      const norm: Record<string, unknown> = { ...raw }
      const toIso = (v: unknown): unknown => {
        if (!v) return v
        const tsLike = v as FirestoreTimestampLike
        if (typeof tsLike?.toDate === 'function') return tsLike.toDate()?.toISOString()
        if (typeof v === 'object' && v !== null && typeof tsLike.seconds === 'number') {
          return new Date(tsLike.seconds * 1000 + Math.floor((tsLike.nanoseconds || 0)/1e6)).toISOString()
        }
        if (typeof v === 'string') return v
        return v
      }
      norm.created_at = toIso(tsCreated)
      norm.updated_at = toIso(tsUpdated)
      if (typeof norm.total !== 'number') {
        const maybe = Number(norm.total)
  ;(norm as { total?: number }).total = Number.isFinite(maybe) ? maybe : 0
      }
      return norm
    })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err, 'GET')
  }
}

// POST /api/orders  Body: { table_id:number, items:[{product_id, quantity}] }
export async function POST(req: NextRequest) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    const body = await req.json()
    const table_id = Number(body.table_id)
    if (!Number.isInteger(table_id) || table_id < 1) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 400 })
    const itemsInput = Array.isArray(body.items) ? body.items : []
    if (!itemsInput.length) return NextResponse.json({ success: false, error: 'INVALID_ITEMS' }, { status: 400 })
    // Validate items
  const rawProductIds = itemsInput.map((it: { product_id: unknown }) => Number(it.product_id))
  const productIds = [...new Set(rawProductIds.filter((id: number) => Number.isInteger(id) && id > 0))] as number[]
    if (!productIds.length) return NextResponse.json({ success: false, error: 'INVALID_ITEMS' }, { status: 400 })
    const db = admin.firestore()
    // Enforce system active
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists || accountSnap.data()?.active === false) {
      return NextResponse.json({ success: false, error: 'SYSTEM_INACTIVE' }, { status: 423 })
    }
    // Check table existence
    const tableSnap = await db.collection('tables').doc(String(table_id)).get()
    if (!tableSnap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 400 })
    const tableData = tableSnap.data()
    if (tableData?.account_id !== accountId) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 400 })

    // Fetch products
    const prodsSnap = await db.collection('products').where('id', 'in', productIds).get()
    const prodMap = new Map<number, FirebaseFirestore.DocumentData>()
    prodsSnap.docs.forEach(d => { const data = d.data(); if (data.account_id === accountId) prodMap.set(data.id, data) })
    if (prodMap.size !== productIds.length) return NextResponse.json({ success: false, error: 'PRODUCT_NOT_FOUND' }, { status: 400 })

    // Build items
    const now = new Date().toISOString()
    let total = 0
  const orderItems: { product_id: number; quantity: number; price: number; product_name: string }[] = []
    for (const raw of itemsInput) {
      const pid = Number(raw.product_id)
      const quantity = Number(raw.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) return NextResponse.json({ success: false, error: 'INVALID_ITEMS' }, { status: 400 })
      const prod = prodMap.get(pid)
      if (!prod) return NextResponse.json({ success: false, error: 'PRODUCT_NOT_FOUND' }, { status: 400 })
      const price = Number(prod.price)
      total += price * quantity
  orderItems.push({ product_id: pid, quantity, price, product_name: prod.name })
    }

  const orderId = await nextSequence('orders')
  const dateKey = getUtcDateKey()
  const daily_number = await nextDailySequence(accountId, dateKey)
  const batch = db.batch()
  const orderDoc = { id: orderId, account_id: accountId, table_id, waiter_id: undefined, status: 'pending', total, created_at: now, updated_at: now, daily_number }
    batch.set(db.collection('orders').doc(String(orderId)), orderDoc)
    for (const it of orderItems) {
      const itemId = await nextSequence('order_items')
      const itemDoc = { id: itemId, order_id: orderId, product_id: it.product_id, product_name: it.product_name, quantity: it.quantity, price: it.price, created_at: now, updated_at: now }
      batch.set(db.collection('order_items').doc(String(itemId)), itemDoc)
    }
  await batch.commit()
  // Fire push asynchronously (do not block response)
  sendOrderNewPush({ id: orderId, table_id, daily_number, account_id: accountId }).catch(e=>console.error('[PUSH][ORDER_NEW]', e))
  console.log('Order created:', orderId)
  return NextResponse.json({ success: true, data: { order: orderDoc, items: orderItems } }, { status: 201 })
  } catch (err) {
    return handleError(err, 'POST')
  }
}

interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][ORDERS][${op}]`, err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
