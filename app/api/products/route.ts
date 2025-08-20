import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'

export async function GET(req: NextRequest) {
  try {
    const sess = await requireSession()
    const url = new URL(req.url)
    const categoryId = url.searchParams.get('category_id')
    const qParam = (url.searchParams.get('q') || '').trim().toLowerCase()
    const limitParam = Number(url.searchParams.get('limit') || '60')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 60
    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }
    const db = admin.firestore()
    let q: FirebaseFirestore.Query = db.collection('products').where('account_id', '==', accountIdNum)
    if (categoryId) q = q.where('category_id', '==', Number(categoryId))
    // Using orderBy name for deterministic pagination (future); Firestore requires index if combining multiple where/order fields
    const snap = await q.orderBy('name').limit(limit).get()
    interface ProductDoc { id?:number; name?:string; [k:string]:unknown }
    let data: ProductDoc[] = snap.docs.map(d => d.data() as ProductDoc)
    if (qParam) {
      data = data.filter(d=> typeof d.name === 'string' && d.name.toLowerCase().includes(qParam))
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }
    const name = toTrimmed(body.name)
    if (!name) return NextResponse.json({ success: false, error: 'Name required' }, { status: 422 })
    const category_id = Number(body.category_id)
    if (!category_id) return NextResponse.json({ success: false, error: 'category_id required' }, { status: 422 })
    const price = Number(body.price)
    if (isNaN(price) || price < 0) return NextResponse.json({ success: false, error: 'price invalid' }, { status: 422 })
    const description = toOptional(body.description)
    const image_url = toOptional(body.image_url) || ''
    const available = typeof body.available === 'boolean' ? body.available : true
    const id = await nextSequence('products')
    const now = new Date().toISOString()
  const doc = { id, account_id: accountIdNum, category_id, name, description, image_url, price, available, created_at: now, updated_at: now }
    await admin.firestore().collection('products').doc(String(id)).set(doc)
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
    console.error('[API][PRODUCTS] Error', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
