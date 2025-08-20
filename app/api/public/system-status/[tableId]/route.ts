import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/system-status/:tableId -> { success, active }
export async function GET(_req: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const tableIdNum = Number(params.tableId)
    if (!Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }

    const db = admin.firestore()

    // التحقق من الطاولة
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }

    const tableData = tableSnap.data()!
    const accountId = tableData.account_id

    // التحقق من الحساب المرتبط بالطاولة
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists) {
      return NextResponse.json({ success: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 404 })
    }

    const accountData = accountSnap.data()!
    const active = accountData.active !== false

    return NextResponse.json({ success: true, active })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUBLIC][SYSTEM_STATUS]', err)
    }
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
