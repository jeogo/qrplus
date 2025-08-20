import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const sess = await requireSession()
    const body = await req.json().catch(() => null)

    if (!body || typeof body.token !== 'string' || !body.token) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    const role = typeof body.role === 'string' ? body.role : sess.role
    const lang = body.lang === 'ar' ? 'ar' : body.lang === 'fr' ? 'fr' : 'fr'

    const db = admin.firestore()
    const ref = db.collection('device_tokens').doc(body.token)
    const now = new Date().toISOString()
    const doc = await ref.get()

    // Extract possible user id from session safely
    const srec = sess as unknown as Record<string, unknown>
    const possibleIds: Array<unknown> = [
      srec['user_id'],
      srec['uid'],
      srec['sub'],
      srec['userId'],
    ]
    const userId =
      possibleIds.find(v => typeof v === 'string' || typeof v === 'number') ??
      'unknown'

    const baseData = {
      user_id: userId,
      role,
      lang,
      platform: 'web',
      active: true,
      last_seen_at: now,
      updated_at: now,
    }

    if (doc.exists) {
      await ref.set({ ...doc.data(), ...baseData }, { merge: true })
    } else {
      await ref.set({
        token: body.token,
        ...baseData,
        created_at: now,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}

interface AppError {
  status?: number
}
function handleError(err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API][DEVICE_REGISTER]', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
