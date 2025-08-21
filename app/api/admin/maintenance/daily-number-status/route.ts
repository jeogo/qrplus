import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'
import { getUtcDateKey } from '@/lib/orders/daily-sequence'

// GET /api/admin/maintenance/daily-number-status?date=YYYY-MM-DD&account_id=123
// Returns current stored value and next value (without incrementing)
export async function GET(req: NextRequest){
  try {
  const sess = await requirePermission('maintenance','special')
    const { searchParams } = new URL(req.url)
    const accountIdParam = searchParams.get('account_id')
    const accountId = accountIdParam ? Number(accountIdParam) : (typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId))
    if(!Number.isFinite(accountId)) return NextResponse.json({ success:false, error:'Account missing' }, { status:400 })
    const dateParam = searchParams.get('date')
    const dateKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getUtcDateKey()

    const db = admin.firestore()
    const ref = db.collection('_daily_sequences').doc(`${accountId}_${dateKey}`)
    const snap = await ref.get()
    const current = snap.exists ? (typeof snap.data()?.value === 'number' ? snap.data()!.value : 0) : 0
    return NextResponse.json({ success:true, data:{ account_id: accountId, date: dateKey, current, next: current + 1 } })
  } catch (err){
    if(process.env.NODE_ENV !== 'production') console.error('[ADMIN][DAILY_NUMBER_STATUS]', err)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}
