import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import { parseJsonBody } from '@/lib/validation/parse'
import { productUpdateSchema, type ProductUpdateInput } from '@/schemas/products'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('products','update')
    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum < 1) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    }

  const { data: bodyData, response } = await parseJsonBody(req, productUpdateSchema)
  if (response) return response
  const updates: Partial<ProductUpdateInput & { updated_at?: unknown }> = { ...bodyData }

    updates.updated_at = admin.firestore.Timestamp.now()

    const ref = admin.firestore().collection('products').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    await ref.update(updates)
  const merged = { ...snap.data(), ...updates }

  return NextResponse.json({ success: true, data: merged })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('products','delete')
    const { id } = await context.params
    const idNum = Number(id)
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
