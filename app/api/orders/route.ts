import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/session'
import { orderCreateSchema } from '@/schemas/orders'
import { toValidationError } from '@/lib/validation/errors'
import { AppError } from '@/lib/errors'
import { toErrorResponse } from '@/lib/api/error-handler'
import { listOrders, createOrder } from '@/services/orders-root-service'

// GET /api/orders?status=&table_id=
export async function GET(req: NextRequest) {
  try {
  const sess = await requirePermission('orders.list','read')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const tableIdRaw = searchParams.get('table_id')

  const data = await listOrders({ accountId, status: status || undefined, tableIdRaw })
  return NextResponse.json({ success: true, data })
  } catch (err) {
  const { status, body } = toErrorResponse(err)
  return NextResponse.json(body, { status })
  }
}

// POST /api/orders  Body: { table_id:number, items:[{product_id, quantity}] }
export async function POST(req: NextRequest) {
  try {
  const sess = await requirePermission('orders.create','create')
  const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  if (!Number.isFinite(accountId)) throw new AppError('Account missing',400,'ACCOUNT_MISSING')

    let body: unknown
  try { body = await req.json() } catch { throw new AppError('Invalid JSON',400,'INVALID_JSON') }
    const parsed = orderCreateSchema.safeParse(body)
    if (!parsed.success) {
      const v = toValidationError(parsed.error)
      return NextResponse.json(v, { status:400 })
    }
  const result = await createOrder({ accountId, input: parsed.data })
  return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (err) {
  const { status, body } = toErrorResponse(err)
  return NextResponse.json(body, { status })
  }
}

// legacy handleError removed in favor of toErrorResponse
