import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/system-status/:tableId -> { success, active }
export async function GET(_req: NextRequest, context: { params: Promise<{ tableId: string }> }) {
  try {
  const { tableId } = await context.params
  const tableIdNum = Number(tableId)
    if (!Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }

  const db = admin.firestore()
  // We don't have restaurantId in this public endpoint. Try direct doc id first, then fallback by table_number.
  let accountId: number | undefined
    const direct = await db.collection('tables').doc(String(tableIdNum)).get()
    if (direct.exists) {
      const d = direct.data() as { account_id?: number }
      accountId = d.account_id
    } else {
      const alt = await db.collection('tables').where('table_number','==',tableIdNum).limit(1).get()
      if (!alt.empty) {
        const d = alt.docs[0].data() as { account_id?: number }
        accountId = d.account_id
      }
    }
    if (!Number.isInteger(accountId)) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })

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
