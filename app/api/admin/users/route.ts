import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'
import { nextSequence } from '@/lib/firebase/sequences'
import { z } from 'zod'
import { usernameSchema, passwordSchema } from '@/schemas/shared'

interface StaffUser {
  id: number
  account_id: number
  username: string
  username_lower: string
  role: 'waiter' | 'kitchen'
  permissions: { approve_orders: boolean; serve_orders: boolean; make_ready: boolean }
  active: boolean
  created_at: string
  updated_at: string
}

interface RawUserDoc {
  id?: number
  account_id?: number
  username?: string
  username_lower?: string
  role?: 'waiter' | 'kitchen'
  permissions?: {
    approve_orders?: boolean
    serve_orders?: boolean
    make_ready?: boolean
    [k: string]: unknown
  }
  active?: boolean
  created_at?: string
  updated_at?: string
  password?: string
  [k: string]: unknown
}

// Sanitize Firestore raw doc to StaffUser
function sanitize(u: RawUserDoc): StaffUser {
  return {
    id: u.id ?? 0,
    account_id: u.account_id ?? 0,
    username: u.username ?? '',
    username_lower: u.username_lower ?? (u.username ?? '').toLowerCase(),
    role: u.role ?? 'waiter',
    permissions: {
      approve_orders: !!u.permissions?.approve_orders,
      serve_orders: !!u.permissions?.serve_orders,
      make_ready: !!u.permissions?.make_ready,
    },
    active: u.active !== false,
    created_at: u.created_at ?? new Date().toISOString(),
    updated_at: u.updated_at ?? new Date().toISOString(),
  }
}

// GET /api/admin/staff_users - List all staff for current account
export async function GET() {
  try {
  const sess = await requirePermission('users','read')

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })

    const snap = await admin.firestore().collection('staff_users').where('account_id', '==', accountId).get()
    const users = snap.docs.map(d => sanitize(d.data()))
    return NextResponse.json({ success: true, data: users })
  } catch (err) {
    console.error('[API][ADMIN][USERS][GET]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/staff_users - Add a new staff user
const createStaffSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(['waiter','kitchen']).default('waiter'),
  permissions: z.object({
    approve_orders: z.boolean().optional(),
    serve_orders: z.boolean().optional(),
    make_ready: z.boolean().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
  const sess = await requirePermission('users','create')

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })

    let parsed: z.infer<typeof createStaffSchema>
    try {
      const body = await req.json()
      parsed = createStaffSchema.parse(body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { username, password, role } = parsed
    const perms = parsed.permissions || {}

    // Check for duplicate username within the account
    const dupSnap = await admin.firestore()
      .collection('staff_users')
      .where('account_id', '==', accountId)
      .where('username_lower', '==', username.toLowerCase())
      .limit(1)
      .get()
    if (!dupSnap.empty) return NextResponse.json({ success: false, error: 'Username exists' }, { status: 409 })

    const now = new Date().toISOString()
    const id = await nextSequence('staff_users')
  const passwordHash = await bcrypt.hash(password, 10)

    const doc: RawUserDoc & { password: string } = {
      id,
      account_id: accountId,
      username,
      username_lower: username.toLowerCase(),
      password: passwordHash,
      role,
      permissions: {
        approve_orders: role === 'waiter' ? false : !!perms.approve_orders,
        serve_orders: role === 'waiter' ? true : !!perms.serve_orders,
        make_ready: role === 'kitchen' ? true : !!perms.make_ready,
      },
      active: true,
      created_at: now,
      updated_at: now,
    }

    await admin.firestore().collection('staff_users').doc(String(id)).set(doc)
    return NextResponse.json({ success: true, data: sanitize(doc) })
  } catch (err) {
    console.error('[API][ADMIN][USERS][POST]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
