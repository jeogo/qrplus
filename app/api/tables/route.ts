import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'
import { parseJsonBody } from '@/lib/validation/parse'
import { tableCreateSchema } from '@/schemas/tables'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/tables - list tables for the authenticated account
export async function GET() {
  try {
  const sess = await requirePermission('tables','read')
    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const snap = await admin.firestore()
      .collection('tables')
      .where('account_id', '==', accountIdNum)
      .orderBy('id')
      .get()

    const data = snap.docs.map(d => d.data())
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err, 'GET')
  }
}

// POST /api/tables - create a new table
export async function POST(req: NextRequest) {
  try {
    const sess = await requirePermission('tables','create')
    const { data, response } = await parseJsonBody(req, tableCreateSchema)
    if (response) return response
    const input = data!

    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const db = admin.firestore()
    const id = await nextSequence('tables')
    const now = new Date().toISOString()
    const host = input.__host_override || (req.headers.get('x-forwarded-host') || req.headers.get('host'))
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const origin = host ? `${proto}://${host}` : ''
  // We display /menu/:restaurantId/:tableNumber publicly; fallback to internal id was removed

    // Assign table_number: use provided or smallest missing positive
    let assignedNumber = input.table_number
  if (!assignedNumber) {
      await db.runTransaction(async tx => {
        // Re-query inside transaction for race safety
        const snap = await tx.get(db.collection('tables').where('account_id','==', accountIdNum))
        const used = new Set<number>()
        snap.docs.forEach(d=>{
          const tn = (d.data() as { table_number?: number }).table_number
            if (typeof tn === 'number' && tn > 0) used.add(tn)
        })
        // Find smallest missing positive integer
        let candidate = 1
        while (used.has(candidate)) candidate++
        assignedNumber = candidate
  const doc = { id, account_id: accountIdNum, table_number: assignedNumber, qr_code: `${origin}/menu/${accountIdNum}/${assignedNumber}`, created_at: now, updated_at: now }
        tx.set(db.collection('tables').doc(String(id)), doc)
      })
    } else {
      // Provided: ensure uniqueness
      const existingSnap = await db.collection('tables')
        .where('account_id', '==', accountIdNum)
        .where('table_number', '==', assignedNumber)
        .limit(1)
        .get()
      if (!existingSnap.empty) {
        return NextResponse.json({ success: false, error: 'TABLE_NUMBER_EXISTS' }, { status: 409 })
      }
      const doc = { id, account_id: accountIdNum, table_number: assignedNumber, qr_code: `${origin}/menu/${accountIdNum}/${assignedNumber}`, created_at: now, updated_at: now }
      await db.collection('tables').doc(String(id)).set(doc)
    }

    logger.info({ msg:'table.created', accountId: accountIdNum, tableId: id, table_number: assignedNumber })
    return NextResponse.json({ success: true, data: { id, account_id: accountIdNum, table_number: assignedNumber, qr_code: `${origin}/menu/${accountIdNum}/${assignedNumber}`, created_at: now, updated_at: now } }, { status: 201 })
  } catch (err) {
    return handleError(err, 'POST')
  }
}

// Generic error handler
interface AppError { status?: number }

function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][TABLES][${op}]`, err)
  }
  const status = (err as AppError)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
