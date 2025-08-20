import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'
import { validateTransition, isOrderStatus } from '@/lib/order-status'
import { mirrorOrderUpdate, mirrorOrderServe, mirrorOrderDelete } from '@/lib/mirror'
import { archiveOrder } from '@/lib/orders/archive'
import {
  sendOrderReadyPush,
  sendOrderApprovedPush,
  sendOrderServedPush,
  sendOrderCancelledPush
} from '@/lib/notifications/push-sender'

// GET /api/orders/:id
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireSession()
    if (!['admin', 'waiter', 'kitchen'].includes(sess.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  const db = admin.firestore()
    const orderRef = db.collection('orders').doc(String(idNum))
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const orderData = orderSnap.data()!
    if (orderData.account_id !== accountId) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const itemsSnap = await db.collection('order_items').where('order_id', '==', idNum).get()
    const items = itemsSnap.docs.map(d => d.data())

    return NextResponse.json({ success: true, data: { order: orderData, items } })
  } catch (err) {
    return handleError(err, 'GET_SINGLE')
  }
}

// PATCH /api/orders/:id
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireSession()
    if (!['admin', 'waiter', 'kitchen'].includes(sess.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const body = await req.json()
    const status = body.status
    if (typeof status !== 'string' || !isOrderStatus(status)) {
      return NextResponse.json({ success: false, error: 'INVALID_STATUS' }, { status: 400 })
    }

  const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  const dbTx = admin.firestore()
  const accountSnap = await dbTx.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists || accountSnap.data()?.active === false) {
      return NextResponse.json({ success: false, error: 'SYSTEM_INACTIVE' }, { status: 423 })
    }

  const ref = dbTx.collection('orders').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const data = snap.data()!
    if (data.account_id !== accountId) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const current = data.status as string
    if (sess.role === 'waiter' && (current !== 'ready' || status !== 'served')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN_TRANSITION' }, { status: 403 })
    } else if (sess.role === 'kitchen' && (current !== 'approved' || status !== 'ready')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN_TRANSITION' }, { status: 403 })
    }

    if (!validateTransition(current, status)) {
      return NextResponse.json({ success: false, error: 'INVALID_TRANSITION' }, { status: 400 })
    }

    const updated_at = new Date().toISOString()
    const last_status_at = updated_at

    // Firestore transaction for idempotent push (pushed_statuses array)
  await dbTx.runTransaction(async tx => {
      const snapInside = await tx.get(ref)
      if (!snapInside.exists) throw new Error('ORDER_NOT_FOUND')
  const docData = snapInside.data() as { pushed_statuses?: string[]; daily_number?: number; table_id?: number }
  const pushed: string[] = Array.isArray(docData.pushed_statuses) ? docData.pushed_statuses : []
      const pushKey = status
      // Update status + timestamps regardless
      tx.update(ref, { status, updated_at, last_status_at, pushed_statuses: pushed.includes(pushKey)? pushed : [...pushed, pushKey] })
      // Decide push sending after transaction based on whether newly added
      const newlyAdded = !pushed.includes(pushKey)
      ;(async()=>{
        try {
          if (status === 'served') {
            await mirrorOrderServe(accountId, { id: idNum, table_id: data.table_id, status, updated_at, last_status_at })
            if (newlyAdded) await sendOrderServedPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId })
            try { await archiveOrder(accountId, idNum, 'served') } catch (e) { console.error('[ARCHIVE][SERVE] failed', e) }
          } else {
            await mirrorOrderUpdate(accountId, { id: idNum, table_id: data.table_id, status, updated_at, last_status_at })
            if (newlyAdded) {
              if (status === 'approved') await sendOrderApprovedPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId })
              if (status === 'ready') await sendOrderReadyPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId })
            }
          }
        } catch(e){ console.error('[PUSH][ASYNC_STATUS]', e) }
      })()
    })

    return NextResponse.json({ success: true, data: { ...data, status, updated_at, last_status_at, archived: status === 'served' } })
  } catch (err) {
    return handleError(err, 'PATCH')
  }
}

// DELETE /api/orders/:id
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

  const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  const dbBase = admin.firestore()
  const accountSnap = await dbBase.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists || accountSnap.data()?.active === false) {
      return NextResponse.json({ success: false, error: 'SYSTEM_INACTIVE' }, { status: 423 })
    }

  const ref = dbBase.collection('orders').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })

    const data = snap.data()!
    if (data.account_id !== accountId) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    if (data.status !== 'pending') return NextResponse.json({ success: false, error: 'CANNOT_ARCHIVE_STATUS' }, { status: 409 })

    console.log(`[DELETE] Deleting order ID=${idNum}, table=${data.table_id}, account=${accountId}`)
    // Idempotent cancellation push
  await dbBase.runTransaction(async tx => {
      const snapInside = await tx.get(ref)
      if (!snapInside.exists) return
  const docData = snapInside.data() as { pushed_statuses?: string[]; daily_number?: number; table_id?: number }
  const pushed: string[] = Array.isArray(docData.pushed_statuses) ? docData.pushed_statuses : []
      const newlyAdded = !pushed.includes('cancelled')
      tx.update(ref, { pushed_statuses: newlyAdded ? [...pushed, 'cancelled'] : pushed })
      ;(async()=>{
        try {
          await mirrorOrderDelete(accountId, idNum, data.table_id)
          try { await archiveOrder(accountId, idNum, 'cancelled') } catch (e) { console.error('[ARCHIVE][CANCEL] failed', e) }
          if (newlyAdded) await sendOrderCancelledPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId })
        } catch(e){ console.error('[PUSH][ASYNC_CANCEL]', e) }
      })()
    })

    return NextResponse.json({ success: true, message: 'Order archived successfully' })
  } catch (err) {
    return handleError(err, 'DELETE')
  }
}

interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') console.error(`[API][ORDERS_ID][${op}]`, err)
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
