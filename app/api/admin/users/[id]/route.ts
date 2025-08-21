import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { usernameSchema, passwordSchema } from '@/schemas/shared'

const updateStaffSchema = z.object({
  username: usernameSchema.optional(),
  password: passwordSchema.optional(),
  role: z.enum(['waiter','kitchen']).optional(),
  permissions: z.object({
    approve_orders: z.boolean().optional(),
    serve_orders: z.boolean().optional(),
    make_ready: z.boolean().optional(),
  }).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
  const sess = await requirePermission('users','update')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  const { id } = await context.params
  const idNum = Number(id)
    if (!Number.isFinite(idNum)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })

    let body: z.infer<typeof updateStaffSchema>
    try {
      const raw = await req.json()
      body = updateStaffSchema.parse(raw)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.username !== undefined) {
      const username = body.username
      // uniqueness check
      const dupSnap = await admin.firestore().collection('staff_users')
        .where('account_id', '==', accountId)
        .where('username_lower', '==', username.toLowerCase())
        .where('id', '!=', idNum)
        .limit(1)
        .get()
      if (!dupSnap.empty) return NextResponse.json({ success: false, error: 'Username exists' }, { status: 409 })
      updates.username = username
      updates.username_lower = username.toLowerCase()
    }

    if (body.password) {
      updates.password = await bcrypt.hash(body.password, 10)
    }

    if (body.role !== undefined) {
      const role = body.role === 'kitchen' ? 'kitchen' : 'waiter'
      updates.role = role
      // if permissions not included we still may need to adjust defaults
      if (!body.permissions) {
        updates.permissions = {
          approve_orders: role === 'waiter' ? false : false, // keep false unless explicitly set for kitchen future roles
          serve_orders: role === 'waiter',
          make_ready: role === 'kitchen'
        }
      }
    }

    if (body.permissions !== undefined) {
      const p = body.permissions || {}
      // Enforce policy: waiter cannot approve orders, kitchen cannot serve (if you want) but keep flexibility except blocking approve for waiter
      const role = (updates.role as string) || body.role
      const approve = role === 'waiter' ? false : !!p.approve_orders
      updates.permissions = {
        approve_orders: approve,
        serve_orders: !!p.serve_orders || role === 'waiter',
        make_ready: !!p.make_ready || role === 'kitchen'
      }
    }

    if (body.active !== undefined) {
      updates.active = !!body.active
    }

    const snap = await admin.firestore().collection('staff_users')
      .where('account_id', '==', accountId)
      .where('id', '==', idNum)
      .limit(1)
      .get()

    if (snap.empty) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    const docRef = snap.docs[0].ref
    await docRef.update(updates)
    const updated = (await docRef.get()).data()
    return NextResponse.json({ success: true, data: {
      id: updated!.id,
      account_id: updated!.account_id,
      username: updated!.username,
      username_lower: updated!.username_lower,
      role: updated!.role,
      permissions: updated!.permissions,
      active: updated!.active !== false,
      created_at: updated!.created_at,
      updated_at: updated!.updated_at,
    } })
  } catch (err) {
    console.error('[API][ADMIN][USERS][PATCH]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
  const sess = await requirePermission('users','delete')
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
  const { id } = await context.params
  const idNum = Number(id)
    if (!Number.isFinite(idNum)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })

    const snap = await admin.firestore().collection('staff_users')
      .where('account_id', '==', accountId)
      .where('id', '==', idNum)
      .limit(1)
      .get()
    if (snap.empty) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    await snap.docs[0].ref.delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API][ADMIN][USERS][DELETE]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
