import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import { validateTransition, isOrderStatus } from '@/lib/order-status'
import { mirrorOrderUpdate, mirrorOrderServe, mirrorOrderDelete } from '@/lib/mirror'
import { archiveOrder } from '@/lib/orders/archive'
import { sendOrderReadyPush, sendOrderApprovedPush, sendOrderServedPush, sendOrderCancelledPush } from '@/lib/notifications/push-sender'

// Transition map moved to lib/order-status.ts

// GET /api/orders/:id  -> order + items
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = await requireSession()
    // Allow admin, waiter, and kitchen staff to view order details
    if (sess.role !== 'admin' && sess.role !== 'waiter' && sess.role !== 'kitchen') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    const idNum = Number(params.id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
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

// PATCH /api/orders/:id  Body: { status }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = await requireSession()
    
    // Allow admin for all transitions, waiter only for serving (ready → served), kitchen only for prep (approved → ready)
    if (sess.role !== 'admin' && sess.role !== 'waiter' && sess.role !== 'kitchen') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    const idNum = Number(params.id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    const body = await req.json()
    const status = body.status
    if (typeof status !== 'string' || !isOrderStatus(status)) {
      return NextResponse.json({ success: false, error: 'INVALID_STATUS' }, { status: 400 })
    }
    
    const db = admin.firestore()
    // Enforce system active before status change
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists || accountSnap.data()?.active === false) {
      return NextResponse.json({ success: false, error: 'SYSTEM_INACTIVE' }, { status: 423 })
    }
    const ref = db.collection('orders').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    const data = snap.data()!
    if (data.account_id !== accountId) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    const current = data.status as string
    
    // Role-specific transition validation
    if (sess.role === 'waiter') {
      // Waiters can only serve ready orders
      if (current !== 'ready' || status !== 'served') {
        return NextResponse.json({ success: false, error: 'FORBIDDEN_TRANSITION' }, { status: 403 })
      }
    } else if (sess.role === 'kitchen') {
      // Kitchen can only mark approved orders as ready
      if (current !== 'approved' || status !== 'ready') {
        return NextResponse.json({ success: false, error: 'FORBIDDEN_TRANSITION' }, { status: 403 })
      }
    }
    
    if (!validateTransition(current, status)) {
      return NextResponse.json({ success: false, error: 'INVALID_TRANSITION' }, { status: 400 })
    }
    const updated_at = new Date().toISOString()
    const last_status_at = updated_at
  await ref.update({ status, updated_at, last_status_at })
    if (status === 'served') {
      await mirrorOrderServe(accountId, { id: idNum, table_id: data.table_id, status, updated_at, last_status_at })
      // Fire served push (admin visibility)
      sendOrderServedPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId }).catch(e=>console.error('[PUSH][ORDER_SERVED]', e))
      // Archive after marking served (fire-and-forget errors logged)
      try { await archiveOrder(accountId, idNum, 'served') } catch (e) { console.error('[ARCHIVE][SERVE] failed', e) }
    } else {
      await mirrorOrderUpdate(accountId, { id: idNum, table_id: data.table_id, status, updated_at, last_status_at })
      if (status === 'approved') {
        sendOrderApprovedPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId }).catch(e=>console.error('[PUSH][ORDER_APPROVED]', e))
      } else if (status === 'ready') {
        // Fire push for ready orders (waiter + admin)
        sendOrderReadyPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId }).catch(e=>console.error('[PUSH][ORDER_READY]', e))
      }
    }
  return NextResponse.json({ success: true, data: { ...data, status, updated_at, last_status_at, archived: status==='served' } })
  } catch (err) {
    return handleError(err, 'PATCH')
  }
}

// DELETE /api/orders/:id  (only if pending)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    const idNum = Number(params.id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    
    const db = admin.firestore()
    // Enforce system active before delete/archive
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists || accountSnap.data()?.active === false) {
      return NextResponse.json({ success: false, error: 'SYSTEM_INACTIVE' }, { status: 423 })
    }
    const ref = db.collection('orders').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    
    const data = snap.data()!
    if (data.account_id !== accountId) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
  if (data.status !== 'pending') return NextResponse.json({ success: false, error: 'CANNOT_ARCHIVE_STATUS' }, { status: 409 })
    
    console.log(`[DELETE] Starting order deletion: ID=${idNum}, table=${data.table_id}, account=${accountId}`)
    
  // Archive instead of hard delete
  await mirrorOrderDelete(accountId, idNum, data.table_id)
  try { await archiveOrder(accountId, idNum, 'cancelled') } catch (e) { console.error('[ARCHIVE][CANCEL] failed', e) }
  // Fire cancelled push
  sendOrderCancelledPush({ id: idNum, table_id: data.table_id, daily_number: data.daily_number, account_id: accountId }).catch(e=>console.error('[PUSH][ORDER_CANCELLED]', e))
  return NextResponse.json({ success: true, message: 'Order archived successfully' })
  } catch (err) {
    console.error(`[DELETE] Error deleting order:`, err)
    return handleError(err, 'DELETE')
  }
}

interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][ORDERS_ID][${op}]`, err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
