import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    await requireSession() // ensure authenticated

    const body = await req.json().catch(() => null)
    if (!body || typeof body.token !== 'string' || !body.token) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    const db = admin.firestore()
    const ref = db.collection('device_tokens').doc(body.token)
    const doc = await ref.get()

    if (doc.exists) {
      await ref.set(
        { active: false, updated_at: new Date().toISOString() },
        { merge: true }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}

interface AppError { status?: number }
function handleError(err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API][DEVICE_UNREGISTER]', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
