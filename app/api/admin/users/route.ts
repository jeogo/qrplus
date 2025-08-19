import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'
import { nextSequence } from '@/lib/firebase/sequences'

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

export async function GET() {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    const snap = await admin.firestore().collection('staff_users').where('account_id', '==', accountId).get()
    const users = snap.docs.map(d => sanitize(d.data()))
    return NextResponse.json({ success: true, data: users })
  } catch (err) {
    console.error('[API][ADMIN][USERS][GET]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await requireSession()
    if (sess.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)

    const body = await req.json()
    const username: string = String(body.username || '').trim()
    const password: string = String(body.password || '')
    const role: 'waiter' | 'kitchen' = body.role === 'kitchen' ? 'kitchen' : 'waiter'
    const perms = body.permissions || {}

    if (!username || username.length < 3) {
      return NextResponse.json({ success: false, error: 'Invalid username' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Weak password' }, { status: 400 })
    }

    // Unique username per account
    const dupSnap = await admin.firestore().collection('staff_users')
      .where('account_id', '==', accountId)
      .where('username_lower', '==', username.toLowerCase())
      .limit(1)
      .get()
    if (!dupSnap.empty) {
      return NextResponse.json({ success: false, error: 'Username exists' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const id = await nextSequence('staff_users')
    const passwordHash = await bcrypt.hash(password, 10)

  const doc = {
      id,
      account_id: accountId,
      username,
      username_lower: username.toLowerCase(),
      password: passwordHash,
      role,
      permissions: {
    // Waiter: can only serve orders (no approve, no make_ready)
    approve_orders: role === 'waiter' ? false : !!perms.approve_orders,
    serve_orders: role === 'waiter' ? true : !!perms.serve_orders,
    // Kitchen: can make orders ready
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
