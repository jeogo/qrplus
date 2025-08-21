import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'
import { parseJsonBody } from '@/lib/validation/parse'
import { productCreateSchema } from '@/schemas/products'

// GET /api/products?category_id=&q=&limit=
export async function GET(req: NextRequest) {
  try {
  const sess = await requirePermission('products','read')
    const url = new URL(req.url)
    const categoryIdRaw = url.searchParams.get('category_id')
    const qParam = (url.searchParams.get('q') || '').trim().toLowerCase()
    const limitParam = Number(url.searchParams.get('limit') || '60')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 60

    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const db = admin.firestore()
    let q: FirebaseFirestore.Query = db.collection('products').where('account_id', '==', accountIdNum)

    if (categoryIdRaw) {
      const categoryId = Number(categoryIdRaw)
      if (!Number.isInteger(categoryId)) {
        return NextResponse.json({ success: false, error: 'INVALID_CATEGORY' }, { status: 400 })
      }
      q = q.where('category_id', '==', categoryId)
    }

    const snap = await q.orderBy('name').limit(limit).get()
    const data = snap.docs.map(d => d.data())

    // simple client-side search
    const filtered = qParam
      ? data.filter(d => typeof d.name === 'string' && d.name.toLowerCase().includes(qParam))
      : data

    return NextResponse.json({ success: true, data: filtered })
  } catch (err) {
    return handleError(err)
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const sess = await requirePermission('products','create')
    const { data, response } = await parseJsonBody(req, productCreateSchema)
    if (response) return response
    const input = data!

    const accountIdNum = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const id = await nextSequence('products')
    const now = admin.firestore.Timestamp.now()
    const doc = {
      id,
      account_id: accountIdNum,
      category_id: input.category_id,
      name: input.name,
      description: input.description,
      image_url: input.image_url || '',
      price: input.price,
      available: input.available ?? true,
      created_at: now,
      updated_at: now,
    }
    await admin.firestore().collection('products').doc(String(id)).set(doc)
    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

// removed unused trim helpers

interface AppError { status?: number }
function handleError(err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API][PRODUCTS] Error', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
