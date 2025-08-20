import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'

export async function GET(req: NextRequest) {
  try {
    const sess = await requireSession()
      const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
      if (!Number.isFinite(accountIdNum)) {
        return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
      }
      const { searchParams } = new URL(req.url)
      const limitParam = Number(searchParams.get('limit') || '50')
      const qRaw = (searchParams.get('q') || '').trim().toLowerCase()
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50
      let qry: FirebaseFirestore.Query = admin.firestore().collection('categories')
        .where('account_id', '==', accountIdNum)
        .orderBy('name')
      // Firestore simple contains search would need indexing; do client side filter after fetch until we implement a proper search index
      const snap = await qry.limit(limit).get()
      let docs = snap.docs.map(d => d.data())
      if (qRaw) {
        docs = docs.filter((d: any)=> typeof d.name === 'string' && d.name.toLowerCase().includes(qRaw))
      }
      return NextResponse.json({ success: true, data: docs })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }
    const body = await req.json()
    const name = toTrimmed(body.name)
    if (!name) return NextResponse.json({ success: false, error: 'Name required' }, { status: 422 })
    const description = toOptional(body.description)
  const image_url = toTrimmed(body.image_url)
  if (!image_url) return NextResponse.json({ success: false, error: 'image_url required' }, { status: 422 })
    const active = typeof body.active === 'boolean' ? body.active : true
    const id = await nextSequence('categories')
    const now = new Date().toISOString()
  const doc = { id, account_id: accountIdNum, name, description, image_url, active, created_at: now, updated_at: now }
    await admin.firestore().collection('categories').doc(String(id)).set(doc)
    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function toTrimmed(v: unknown): string | null { return typeof v === 'string' ? v.trim() || null : null }
function toOptional(v: unknown): string | undefined { const t = toTrimmed(v); return t === null ? undefined : t }

interface AppError { status?: number }
function handleError(err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API][CATEGORIES] Error', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
