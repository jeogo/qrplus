import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/tables/:id - update table_number
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const idNum = Number(params.id)
    if (!Number.isInteger(idNum) || idNum < 1) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })

  const body: { table_number?: unknown } = await req.json()
  const updates: Partial<{ table_number: number; updated_at: string }> = {}
  // Hold snapshot for later merge
  let currentSnap: FirebaseFirestore.DocumentSnapshot | null = null

    if (body.table_number !== undefined) {
      const newNum = Number(body.table_number)
      if (!Number.isInteger(newNum) || newNum < 1) return NextResponse.json({ success: false, error: 'INVALID_TABLE_NUMBER' }, { status: 400 })

      // Load current table to get account_id
      currentSnap = await admin.firestore().collection('tables').doc(String(idNum)).get()
      if (!currentSnap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })

      const currentData = currentSnap.data() as { account_id?: number; table_number?: number }

      // Only check uniqueness if table_number is actually changing
      if (currentData.table_number !== newNum && typeof currentData.account_id === 'number') {
        const dupSnap = await admin.firestore()
          .collection('tables')
          .where('account_id', '==', currentData.account_id)
          .where('table_number', '==', newNum)
          .limit(1)
          .get()
        if (!dupSnap.empty) return NextResponse.json({ success: false, error: 'TABLE_NUMBER_EXISTS' }, { status: 409 })
      }

      updates.table_number = newNum
    }

    if (!Object.keys(updates).length) return NextResponse.json({ success: false, error: 'NO_UPDATE_FIELDS' }, { status: 400 })
    updates.updated_at = new Date().toISOString()

    await admin.firestore().collection('tables').doc(String(idNum)).update(updates)

    // Build response data (fetch if snapshot not previously loaded)
    let baseData: Record<string, unknown> = currentSnap ? (currentSnap.data() || {}) : {}
    if (!currentSnap) {
      const snap = await admin.firestore().collection('tables').doc(String(idNum)).get()
      baseData = snap.data() || {}
    }
    const data = { ...baseData, ...updates }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err, 'PATCH')
  }
}

// DELETE /api/tables/:id - delete table
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const idNum = Number(params.id)
    if (!Number.isInteger(idNum) || idNum < 1) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })

    const ref = admin.firestore().collection('tables').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })

    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err, 'DELETE')
  }
}

// Generic error handler
interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') console.error(`[API][TABLES][${op}]`, err)
  const status = (err as AppError)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
