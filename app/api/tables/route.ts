import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'

// GET /api/tables - list tables for the authenticated account
export async function GET() {
  try {
    const sess = requireSession()
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

// POST /api/tables - create a new table (fields: table_number)
export async function POST(req: NextRequest) {
  try {
    const sess = requireSession()
    if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }
    const body = await req.json()
    const rawNum = body.table_number
    const table_number = Number(rawNum)
    if (!Number.isInteger(table_number) || table_number < 1) {
      return NextResponse.json({ success: false, error: 'INVALID_TABLE_NUMBER' }, { status: 400 })
    }
    // Uniqueness check (per account) for table_number
    const existingSnap = await admin.firestore()
      .collection('tables')
      .where('account_id', '==', accountIdNum)
      .where('table_number', '==', table_number)
      .limit(1)
      .get()
    if (!existingSnap.empty) {
      return NextResponse.json({ success: false, error: 'TABLE_NUMBER_EXISTS' }, { status: 409 })
    }

    const id = await nextSequence('tables')
    const now = new Date().toISOString()
    const host = body.__host_override || (req.headers.get('x-forwarded-host') || req.headers.get('host'))
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const origin = host ? `${proto}://${host}` : ''
    const qr_code = origin ? `${origin}/menu/${id}` : `/menu/${id}`
    const doc = { id, account_id: accountIdNum, table_number, qr_code, created_at: now, updated_at: now }
    await admin.firestore().collection('tables').doc(String(id)).set(doc)
    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err) {
    return handleError(err, 'POST')
  }
}

interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][TABLES][${op}]`, err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
