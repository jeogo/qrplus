import admin from '@/lib/firebase/admin'
import { assertTransition } from '@/services/orders-transition'
import { orderStatusTransitionCounter } from '@/lib/observability/metrics'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { mirrorOrderServe, mirrorOrderUpdate, mirrorOrderDelete } from '@/lib/mirror'
import { archiveOrder } from '@/lib/orders/archive'
import { sendOrderPush } from '@/services/notification-service'

interface UpdateStatusParams { id: number; accountId: number; role: string; nextStatus: string }

export async function updateOrderStatus({ id, accountId, role, nextStatus }: UpdateStatusParams){
  if (typeof nextStatus !== 'string') throw new ValidationError('INVALID_STATUS')
  const db = admin.firestore()
  const ref = db.collection('orders').doc(String(id))
  const updated_at = new Date().toISOString()
  const last_status_at = updated_at
  let current: string | null = null
  let tableId: number | undefined
  let daily: number | undefined

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new NotFoundError('ORDER_NOT_FOUND')
    const data = snap.data() as any
    if (data.account_id !== accountId) throw new NotFoundError('ORDER_NOT_FOUND')
    current = data.status
    tableId = data.table_id
    daily = data.daily_number
  assertTransition(role, current!, nextStatus)
    const pushed: string[] = Array.isArray(data.pushed_statuses)? data.pushed_statuses: []
    tx.update(ref, { status: nextStatus, updated_at, last_status_at, pushed_statuses: pushed.includes(nextStatus)? pushed : [...pushed, nextStatus] })
  })

  orderStatusTransitionCounter.inc({ from: current!, to: nextStatus, role })

  // Post commit side-effects not awaited by caller (fire and log internally)
  ;(async()=>{
    try {
      if (nextStatus === 'served') {
  await mirrorOrderServe(accountId, { id, table_id: tableId!, status: nextStatus, updated_at, last_status_at })
  await sendOrderPush('order.served', { id, table_id: tableId!, daily_number: daily, account_id: accountId })
        try { await archiveOrder(accountId, id, 'served') } catch(e){ /* swallow */ }
      } else {
  await mirrorOrderUpdate(accountId, { id, table_id: tableId!, status: nextStatus, updated_at, last_status_at })
  if (nextStatus === 'approved') await sendOrderPush('order.approved', { id, table_id: tableId!, daily_number: daily, account_id: accountId })
  if (nextStatus === 'ready') await sendOrderPush('order.ready', { id, table_id: tableId!, daily_number: daily, account_id: accountId })
      }
    } catch(e){ /* swallow */ }
  })()

  return { id, status: nextStatus, updated_at, last_status_at, table_id: tableId }
}

export async function cancelPendingOrder(id: number, accountId: number){
  const db = admin.firestore()
  const ref = db.collection('orders').doc(String(id))
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new NotFoundError('ORDER_NOT_FOUND')
    const data = snap.data() as any
    if (data.account_id !== accountId) throw new NotFoundError('ORDER_NOT_FOUND')
    if (data.status !== 'pending') throw new ValidationError('CANNOT_ARCHIVE_STATUS')
    const pushed: string[] = Array.isArray(data.pushed_statuses)? data.pushed_statuses: []
    const newlyAdded = !pushed.includes('cancelled')
    tx.update(ref, { pushed_statuses: newlyAdded? [...pushed,'cancelled'] : pushed })
    if (newlyAdded) {
      ;(async()=>{
        try {
          await mirrorOrderDelete(accountId, id, data.table_id)
          try { await archiveOrder(accountId, id, 'cancelled') } catch(e){ }
          await sendOrderPush('order.cancelled', { id, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId })
        } catch(e){ }
      })()
    }
  })
  return true
}
