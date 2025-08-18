import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const idNum = Number(params.id)
    if (!idNum) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const body = await req.json()
    const updates: Partial<{
      name: string
      description: string
      image_url: string
      active: boolean
      updated_at: string
    }> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.description === 'string') updates.description = body.description.trim()
    if (typeof body.image_url === 'string') updates.image_url = body.image_url.trim()
    if (typeof body.active === 'boolean') updates.active = body.active
    if (!Object.keys(updates).length) return NextResponse.json({ success: false, error: 'No changes' }, { status: 422 })
    updates.updated_at = new Date().toISOString()
    const ref = admin.firestore().collection('categories').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    await ref.update(updates)
    const data = { ...snap.data(), ...updates }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sess = requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const idNum = Number(params.id)
    if (!idNum) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const db = admin.firestore()
    const catRef = db.collection('categories').doc(String(idNum))
    const snap = await catRef.get()
    if (!snap.exists) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    // cascade delete products under this category for same account
    const batch = db.batch()
    batch.delete(catRef)
    const prodSnap = await db.collection('products').where('category_id', '==', idNum).get()
    prodSnap.forEach(p => batch.delete(p.ref))
    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}

interface AppError { status?: number }
function handleError(err: unknown) {
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
