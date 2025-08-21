import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import { nextSequence } from '@/lib/firebase/sequences'
import { parseJsonBody } from '@/lib/validation/parse'
import { categoryCreateSchema } from '@/schemas/categories'

export async function GET(req: NextRequest) {
  try {
  const sess = await requirePermission('categories','read')
    const accountIdNum =
      typeof sess.accountNumericId === 'number'
        ? sess.accountNumericId
        : Number(sess.accountId)

    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Account missing' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limitParam = Number(searchParams.get('limit') || '50')
    const qRaw = (searchParams.get('q') || '').trim().toLowerCase()

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50

    const qry: FirebaseFirestore.Query = admin
      .firestore()
      .collection('categories')
      .where('account_id', '==', accountIdNum)
      .orderBy('name')

    const snap = await qry.limit(limit).get()

    interface CategoryDoc {
      id?: number
      name?: string
      [k: string]: unknown
    }

    let docs: CategoryDoc[] = snap.docs.map(d => d.data() as CategoryDoc)

    if (qRaw) {
      docs = docs.filter(
        d => typeof d.name === 'string' && d.name.toLowerCase().includes(qRaw)
      )
    }

    return NextResponse.json({ success: true, data: docs })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
  const sess = await requirePermission('categories','create')

    const accountIdNum =
      typeof sess.accountNumericId === 'number'
        ? sess.accountNumericId
        : Number(sess.accountId)

    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Account missing' },
        { status: 400 }
      )
    }

  const { data, response } = await parseJsonBody(req, categoryCreateSchema)
  if (response) return response
  const input = data!
    const id = await nextSequence('categories')
    const now = new Date().toISOString()

    const doc = {
      id,
      account_id: accountIdNum,
      name: input.name,
      description: input.description,
      image_url: input.image_url,
      active: input.active ?? true,
      created_at: now,
      updated_at: now,
    }

    await admin.firestore().collection('categories').doc(String(id)).set(doc)

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

// removed unused trim helpers

interface AppError {
  status?: number
}
function handleError(err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API][CATEGORIES] Error', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
