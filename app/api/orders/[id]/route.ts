import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/session'
// Removed unused import of admin
import { isOrderStatus } from '@/lib/order-status'
import { logger } from '@/lib/observability/logger'
import { ValidationError, AppError } from '@/lib/errors'
import { toErrorResponse } from '@/lib/api/error-handler'
import { withRouteMetrics } from '@/lib/observability/metrics'
import { getOrder, getOrderItems } from '@/repositories/orders-repo'
import { isAccountActive } from '@/repositories/accounts-repo'
import { updateOrderStatus, cancelPendingOrder } from '@/services/orders-service'

// GET /api/orders/:id
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withRouteMetrics('orders_id_get','GET', async () => {
  try {
    const sess = await requirePermission('orders.item','read')
    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) throw new ValidationError('ORDER_NOT_FOUND')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    const order = await getOrder(idNum)
    if (!order || order.account_id !== accountId) throw new ValidationError('ORDER_NOT_FOUND')
    const items = await getOrderItems(idNum)
    return NextResponse.json({ success: true, data: { order, items } })
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    if (process.env.NODE_ENV !== 'production') logger.error({ msg:'order.get.error', err })
    return NextResponse.json(body, { status })
  }
  })
}

// PATCH /api/orders/:id
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withRouteMetrics('orders_id_patch','PATCH', async () => {
  try {
    const sess = await requirePermission('orders.item.status','update')
    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) throw new ValidationError('ORDER_NOT_FOUND')
    const body = await req.json()
    const status = body.status
    if (typeof status !== 'string' || !isOrderStatus(status)) throw new ValidationError('INVALID_STATUS')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  if (!(await isAccountActive(accountId))) throw new AppError('System inactive',423,'SYSTEM_INACTIVE')
  const existing = await getOrder(idNum)
  if (!existing || existing.account_id !== accountId) throw new ValidationError('ORDER_NOT_FOUND')
    const current = existing.status
    const started = Date.now()
    const updated = await updateOrderStatus({ id: idNum, accountId, role: sess.role, nextStatus: status })
    const duration = Date.now()-started
    logger.info({ msg:'order.status.updated', orderId: idNum, from: current, to: status, role: sess.role, accountId, durationMs: duration })
    return NextResponse.json({ success: true, data: { ...existing, ...updated, archived: status === 'served' } })
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    if (process.env.NODE_ENV !== 'production') logger.error({ msg:'order.status.patch.error', orderId: (await context.params).id, err })
    return NextResponse.json(body, { status })
  }
  })
}

// DELETE /api/orders/:id
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withRouteMetrics('orders_id_delete','DELETE', async () => {
  try {
    const sess = await requirePermission('orders.item.delete','delete')
    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) throw new ValidationError('ORDER_NOT_FOUND')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  if (!(await isAccountActive(accountId))) throw new AppError('System inactive',423,'SYSTEM_INACTIVE')
    await cancelPendingOrder(idNum, accountId)
    logger.info({ msg:'order.cancelled', orderId: idNum, accountId, role: sess.role })
    return NextResponse.json({ success: true, message: 'Order archived successfully' })
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    if (process.env.NODE_ENV !== 'production') logger.error({ msg:'order.delete.error', err })
    return NextResponse.json(body, { status })
  }
  })
}

// Legacy handleError removed (standardized error responses now used)
