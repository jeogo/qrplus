import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'

// Phase 1: Basic device token registration
// Body: { token:string, role:string, lang:'ar'|'fr' }
// Idempotent: upsert by token
export async function POST(req: NextRequest) {
  try {
    const sess = requireSession()
    const body = await req.json().catch(()=>null)
    if (!body || typeof body.token !== 'string' || !body.token) {
      return NextResponse.json({ success:false, error:'INVALID_TOKEN' }, { status:400 })
    }
    const role = typeof body.role === 'string' ? body.role : sess.role
    const lang = body.lang === 'ar' ? 'ar' : body.lang === 'fr' ? 'fr' : 'fr'
    const db = admin.firestore()
    const ref = db.collection('device_tokens').doc(body.token)
    const now = new Date().toISOString()
    const doc = await ref.get()
    // Determine user id field from session payload with safe access
  const srec = sess as unknown as Record<string, unknown>
  const possibleIds: Array<unknown> = [srec['user_id'], srec['uid'], srec['sub'], srec['userId']]
    const userId = possibleIds.find(v => typeof v === 'string' || typeof v === 'number') ?? 'unknown'
  if (doc.exists) {
      await ref.set({
        ...doc.data(),
    user_id: userId,
        role,
        lang,
        platform: 'web',
        active: true,
        last_seen_at: now,
        updated_at: now,
      }, { merge: true })
    } else {
      await ref.set({
        token: body.token,
    user_id: userId,
        role,
        lang,
        platform: 'web',
        active: true,
        created_at: now,
        last_seen_at: now,
        updated_at: now,
      })
    }
    return NextResponse.json({ success:true })
  } catch (err) {
    console.error('[API][DEVICE_REGISTER]', err)
    return NextResponse.json({ success:false, error:'SERVER_ERROR' }, { status:500 })
  }
}
