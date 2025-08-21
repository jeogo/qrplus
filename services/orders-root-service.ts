import admin from '@/lib/firebase/admin'
import { nextSequence } from '@/lib/firebase/sequences'
import { nextDailySequence, getUtcDateKey } from '@/lib/orders/daily-sequence'
import { sendOrderNewPush } from '@/lib/notifications/push-sender'
import { AppError } from '@/lib/errors'

interface ListParams { accountId: number; status?: string | null; tableIdRaw?: string | null }
export async function listOrders({ accountId, status, tableIdRaw }: ListParams){
  const db = admin.firestore()
  let q: FirebaseFirestore.Query = db.collection('orders').where('account_id','==', accountId)
  if (status) q = q.where('status','==', status)
  if (tableIdRaw){ const tid = Number(tableIdRaw); if (Number.isInteger(tid)) q = q.where('table_id','==', tid) }
  q = q.orderBy('created_at','desc')
  const snap = await q.get()
  type FirestoreTimestampLike = { toDate?: () => Date; seconds?: number; nanoseconds?: number } | string | null | undefined
  const toIso = (v: FirestoreTimestampLike): string | undefined => {
    if(!v) return undefined
    if (typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function') return v.toDate().toISOString()
    if (typeof v === 'object' && v !== null && 'seconds' in v && typeof (v as any).seconds === 'number'){
      const ts = v as { seconds:number; nanoseconds?: number }
      return new Date(ts.seconds*1000 + Math.floor((ts.nanoseconds||0)/1e6)).toISOString()
    }
    if (typeof v === 'string') return v
    return undefined
  }
  return snap.docs.map(d=>{ const raw = d.data() as any; return { ...raw, created_at: toIso(raw.created_at), updated_at: toIso(raw.updated_at), total: Number.isFinite(Number(raw.total))? Number(raw.total): 0 } })
}

interface CreateOrderInput { table_id: number; items: { product_id: number; quantity: number }[] }
interface CreateParams { accountId: number; input: CreateOrderInput }
export async function createOrder({ accountId, input }: CreateParams){
  const { table_id, items } = input
  const productIds = [...new Set(items.map(i=> i.product_id))]
  const db = admin.firestore()

  const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
  if (!accountSnap.exists || accountSnap.data()?.active === false) throw new AppError('System inactive',423,'SYSTEM_INACTIVE')

  const tableSnap = await db.collection('tables').doc(String(table_id)).get()
  if (!tableSnap.exists || tableSnap.data()?.account_id !== accountId) throw new AppError('Table not found',404,'TABLE_NOT_FOUND')

  const prodsSnap = await db.collection('products')
    .where('id','in', productIds)
    .where('account_id','==', accountId)
    .where('available','==', true)
    .get()

  const prodMap = new Map<number, FirebaseFirestore.DocumentData>()
  prodsSnap.docs.forEach(d=> prodMap.set(d.data().id, d.data()))
  if (prodMap.size !== productIds.length) throw new AppError('One or more products not found',400,'PRODUCT_NOT_FOUND')

  const now = new Date().toISOString()
  let total = 0
  const orderItems: { product_id: number; quantity: number; price: number; product_name: string }[] = []
  for (const it of items){
    const prod = prodMap.get(it.product_id)
  if(!prod) throw new AppError('One or more products not found',400,'PRODUCT_NOT_FOUND')
    const price = Number(prod.price) || 0
    total += price * it.quantity
    orderItems.push({ product_id: it.product_id, quantity: it.quantity, price, product_name: prod.name })
  }

  const orderId = await nextSequence('orders')
  const dateKey = getUtcDateKey()
  const daily_number = await nextDailySequence(accountId, dateKey)

  const batch = db.batch()
  const orderDoc = { id: orderId, account_id: accountId, table_id, waiter_id: undefined as number | undefined, status:'pending' as const, total, created_at: now, updated_at: now, daily_number, pushed_statuses: ['new'] as string[] }
  batch.set(db.collection('orders').doc(String(orderId)), orderDoc)
  for (const it of orderItems){
    const itemId = await nextSequence('order_items')
    const itemDoc = { id: itemId, order_id: orderId, product_id: it.product_id, product_name: it.product_name, quantity: it.quantity, price: it.price, created_at: now, updated_at: now }
    batch.set(db.collection('order_items').doc(String(itemId)), itemDoc)
  }
  await batch.commit()
  sendOrderNewPush({ id: orderId, table_id, daily_number, account_id: accountId }).catch(e=> console.error('[PUSH][ORDER_NEW]', e))
  return { order: orderDoc, items: orderItems }
}
