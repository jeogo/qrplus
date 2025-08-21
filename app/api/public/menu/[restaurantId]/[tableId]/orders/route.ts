import { NextRequest, NextResponse } from 'next/server'
import { AppError, ValidationError, ConflictError, NotFoundError } from '@/lib/errors'
import { toErrorResponse } from '@/lib/api/error-handler'
import admin from '@/lib/firebase/admin'
import { nextSequence } from '@/lib/firebase/sequences'
import { mirrorOrderCreate } from '@/lib/mirror'
import { sendOrderNewPush } from '@/lib/notifications/push-sender'
import { resolveTable } from '@/lib/tables/resolve-table'
import { nextDailySequence, getUtcDateKey } from '@/lib/orders/daily-sequence'

// POST /api/public/menu/:restaurantId/:tableId/orders
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ restaurantId: string; tableId: string }> }
) {
  try {
    const { restaurantId, tableId } = await context.params
    const restaurantIdNum = Number(restaurantId)
    const tableIdNum = Number(tableId)
  if (!Number.isInteger(restaurantIdNum) || !Number.isInteger(tableIdNum)) throw new NotFoundError('NOT_FOUND')

    const body = await req.json().catch(() => ({}))
    const itemsInput = Array.isArray(body.items) ? body.items : []
    const rawNote = typeof body.note === 'string' ? body.note : ''
    const note = rawNote.trim().slice(0, 300)
    const hasNote = note.length > 0
  if (!itemsInput.length || itemsInput.length > 40) throw new ValidationError('INVALID_ITEMS')

    const normalized: { product_id: number; quantity: number }[] = []
    for (const raw of itemsInput) {
      const pid = Number(raw?.product_id)
      const qty = Number(raw?.quantity)
  if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0 || qty > 50) throw new ValidationError('INVALID_ITEMS')
      normalized.push({ product_id: pid, quantity: qty })
    }

    const quantityMap = new Map<number, number>()
    for (const it of normalized) quantityMap.set(it.product_id, (quantityMap.get(it.product_id) || 0) + it.quantity)
    const uniqueItems = [...quantityMap.entries()].map(([product_id, quantity]) => ({ product_id, quantity }))

    const db = admin.firestore()
    const accountSnap = await db.collection('accounts').doc(String(restaurantIdNum)).get()
  if (!accountSnap.exists || accountSnap.data()?.active === false) throw new AppError('System inactive',423,'SYSTEM_INACTIVE')

  const resolved = await resolveTable(restaurantIdNum, tableIdNum)
  if (!resolved) throw new NotFoundError('TABLE_NOT_FOUND')

    const activeSnap = await db
      .collection('orders')
      .where('account_id', '==', restaurantIdNum)
      .where('table_id', '==', tableIdNum)
      .where('status', 'in', ['pending', 'approved', 'ready'])
      .limit(1)
      .get()
    if (!activeSnap.empty) {
      const existing = activeSnap.docs[0].data()
      throw new ConflictError('ACTIVE_ORDER_EXISTS')
    }

    const productIds = uniqueItems.map(i => i.product_id)
    const prodSnap = await db.collection('products').where('id', 'in', productIds).get()
    const prodMap = new Map<number, FirebaseFirestore.DocumentData>()
    prodSnap.docs.forEach(d => {
      const data = d.data()
      if (data.account_id === restaurantIdNum && data.available === true) prodMap.set(data.id, data)
    })
  if (prodMap.size !== productIds.length) throw new ValidationError('PRODUCT_NOT_FOUND')

    const now = new Date().toISOString()
    let total = 0
    const itemsToStore: { product_id: number; product_name: string; quantity: number; price: number }[] = []
    for (const it of uniqueItems) {
      const prod = prodMap.get(it.product_id)!
      const price = Number(prod.price)
      total += price * it.quantity
  if (total > 1_000_000) throw new ValidationError('TOTAL_LIMIT')
      itemsToStore.push({ product_id: it.product_id, product_name: prod.name, quantity: it.quantity, price })
    }

    const orderId = await nextSequence('orders')
    const dateKey = getUtcDateKey()
    const daily_number = await nextDailySequence(restaurantIdNum, dateKey)

    const batch = db.batch()
    const orderDoc: {
      id: number
      account_id: number
      table_id: number
      status: 'pending'
      total: number
      created_at: string
      updated_at: string
      last_status_at: string
      note?: string
      daily_number: number
      pushed_statuses: string[]
    } = {
      id: orderId,
      account_id: restaurantIdNum,
      table_id: tableIdNum,
      status: 'pending',
      total,
      created_at: now,
      updated_at: now,
      last_status_at: now,
      daily_number,
      pushed_statuses: ['new'], // ✅ لتجنب تكرار push للطلب الجديد
    }
    if (hasNote) orderDoc.note = note
    batch.set(db.collection('orders').doc(String(orderId)), orderDoc)

    for (const it of itemsToStore) {
      const itemId = await nextSequence('order_items')
      const itemDoc = {
        id: itemId,
        order_id: orderId,
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        price: it.price,
        created_at: now,
        updated_at: now,
      }
      batch.set(db.collection('order_items').doc(String(itemId)), itemDoc)
    }

    await batch.commit()

    // Mirror for external system
    await mirrorOrderCreate(
      restaurantIdNum,
      hasNote
        ? { id: orderId, table_id: tableIdNum, status: 'pending', total, created_at: now, updated_at: now, last_status_at: now, note }
        : { id: orderId, table_id: tableIdNum, status: 'pending', total, created_at: now, updated_at: now, last_status_at: now }
    )

    // ✅ Push notification مع تحقق مبدئي من duplicate عبر pushed_statuses
    const pushKey = 'new'
    if (!orderDoc.pushed_statuses.includes(pushKey)) {
      sendOrderNewPush({ id: orderId, table_id: tableIdNum, daily_number, account_id: restaurantIdNum }).catch(e =>
        console.error('[PUSH][PUBLIC_ORDER_NEW+RID]', e)
      )
    }

    return NextResponse.json({ success: true, data: { order: orderDoc, items: itemsToStore } }, { status: 201 })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[PUBLIC][ORDER_CREATE+RID]', err)
    const { status, body } = toErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
