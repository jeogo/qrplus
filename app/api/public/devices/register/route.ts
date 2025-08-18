import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// Public device token registration for client (table) visitors.
// Body: { token:string, lang:'ar'|'fr', tableId:string|number, accountId?:number }
// Stores role='client' and associates table/account for filtered pushes.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>null)
    if (!body || typeof body.token !== 'string' || !body.token) {
      return NextResponse.json({ success:false, error:'INVALID_TOKEN' }, { status:400 })
    }
    const lang = body.lang === 'ar' ? 'ar' : 'fr'
    const tableIdRaw = body.tableId
    const tableId = (typeof tableIdRaw === 'string' || typeof tableIdRaw === 'number') ? Number(tableIdRaw) : null
    const accountId = typeof body.accountId === 'number' ? body.accountId : null
    if (!tableId || Number.isNaN(tableId)) {
      return NextResponse.json({ success:false, error:'INVALID_TABLE' }, { status:400 })
    }
    const db = admin.firestore()
    const ref = db.collection('device_tokens').doc(body.token)
    const now = new Date().toISOString()
    const base = {
      token: body.token,
      role: 'client',
      lang,
      table_id: tableId,
      account_id: accountId,
      platform: 'web',
      active: true,
      updated_at: now,
      last_seen_at: now,
    }
    const doc = await ref.get()
    if (doc.exists) {
      await ref.set(base, { merge:true })
    } else {
      await ref.set({ ...base, created_at: now })
    }
    return NextResponse.json({ success:true })
  } catch (e) {
    console.error('[API][PUBLIC_DEVICE_REGISTER]', e)
    return NextResponse.json({ success:false, error:'SERVER_ERROR' }, { status:500 })
  }
}
