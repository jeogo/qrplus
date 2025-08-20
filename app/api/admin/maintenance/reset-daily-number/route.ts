import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'
import { getUtcDateKey } from '@/lib/orders/daily-sequence'

// POST /api/admin/maintenance/reset-daily-number  Body: { account_id?: number, date?: string }
// If account_id omitted uses current admin account. Resets today's counter (or provided date) to 0 so next order becomes 1.
export async function POST(req: NextRequest){
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success:false, error:'Forbidden' }, { status:403 })
    const body = await req.json().catch(()=>({}))
    const accountId = typeof body.account_id === 'number' ? body.account_id : (typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId))
    if(!Number.isFinite(accountId)) return NextResponse.json({ success:false, error:'Account missing' }, { status:400 })
    const dateKeyRaw = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : getUtcDateKey()

    const db = admin.firestore()
    const ref = db.collection('_daily_sequences').doc(`${accountId}_${dateKeyRaw}`)
    await ref.set({ value: 0, account_id: accountId, date: dateKeyRaw, updated_at: new Date().toISOString(), manual_reset: true }, { merge: true })

    return NextResponse.json({ success:true, data:{ account_id: accountId, date: dateKeyRaw, reset_to: 0 } })
  } catch (err){
    if(process.env.NODE_ENV !== 'production') console.error('[ADMIN][RESET_DAILY_NUMBER]', err)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}
