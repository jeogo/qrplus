import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'

// Phase 1: Basic device token unregistration (soft deactivate)
// Body: { token:string }
export async function POST(req: NextRequest) {
  try {
    requireSession() // ensure authenticated
    const body = await req.json().catch(()=>null)
    if (!body || typeof body.token !== 'string' || !body.token) {
      return NextResponse.json({ success:false, error:'INVALID_TOKEN' }, { status:400 })
    }
    const db = admin.firestore()
    const ref = db.collection('device_tokens').doc(body.token)
    const doc = await ref.get()
    if (doc.exists) {
      await ref.set({ active:false, updated_at: new Date().toISOString() }, { merge:true })
    }
    return NextResponse.json({ success:true })
  } catch (err) {
    console.error('[API][DEVICE_UNREGISTER]', err)
    return NextResponse.json({ success:false, error:'SERVER_ERROR' }, { status:500 })
  }
}
