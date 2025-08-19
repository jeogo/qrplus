import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

// PATCH /api/tables/:id - update table_number (optional)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const idNum = Number(params.id)
    if (!Number.isInteger(idNum) || idNum < 1) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const body = await req.json()
    const updates: Partial<{ table_number: number; updated_at: string }> = {}
    if (body.table_number !== undefined) {
      const n = Number(body.table_number)
      if (!Number.isInteger(n) || n < 1) return NextResponse.json({ success: false, error: 'INVALID_TABLE_NUMBER' }, { status: 400 })
      // Check uniqueness inside account scope
      const snapCurrent = await admin.firestore().collection('tables').doc(String(idNum)).get()
      if (!snapCurrent.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
      const currentData = snapCurrent.data() as { account_id?: number; table_number?: number }
      if (currentData.table_number !== n) {
        const accountId = currentData.account_id
        if (typeof accountId === 'number') {
          const dup = await admin.firestore().collection('tables')
            .where('account_id','==', accountId)
            .where('table_number','==', n)
            .limit(1)
            .get()
          if (!dup.empty) {
            return NextResponse.json({ success: false, error: 'TABLE_NUMBER_EXISTS' }, { status: 409 })
          }
        }
      }
      updates.table_number = n
    }
    if (!Object.keys(updates).length) return NextResponse.json({ success: false, error: 'NO_UPDATE_FIELDS' }, { status: 400 })
    updates.updated_at = new Date().toISOString()
    const ref = admin.firestore().collection('tables').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    await ref.update(updates)
    const data = { ...snap.data(), ...updates }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err, 'PATCH')
  }
}

// DELETE /api/tables/:id - hard delete
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

interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][TABLES][${op}]`, err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
