import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const idNum = Number(params.id)
    if (!Number.isInteger(idNum) || idNum < 1) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    }

    const body = await req.json()
    const updates: Partial<{
      name: string
      description: string
      image_url: string
      available: boolean
      price: number
      updated_at: FirebaseFirestore.Timestamp
    }> = {}

    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.description === 'string') updates.description = body.description.trim()
    if (typeof body.image_url === 'string') updates.image_url = body.image_url.trim()
    if (typeof body.available === 'boolean') updates.available = body.available
    if (typeof body.price !== 'undefined') {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ success: false, error: 'Price invalid' }, { status: 422 })
      }
      updates.price = price
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ success: false, error: 'No changes' }, { status: 422 })
    }

    updates.updated_at = admin.firestore.Timestamp.now()

    const ref = admin.firestore().collection('products').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    await ref.update(updates)
    const data = { ...snap.data(), ...updates }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const idNum = Number(params.id)
    if (!Number.isInteger(idNum) || idNum < 1) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    }

    const ref = admin.firestore().collection('products').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}

interface AppError { status?: number }
function handleError(err: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API][PRODUCTS][ID] Error', err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
