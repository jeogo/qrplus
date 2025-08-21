import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { createToken } from '@/lib/auth/jwt'
import bcrypt from 'bcryptjs'
import { loginSchema } from '@/schemas/auth'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    let parsed: { identifier: string; password: string }
    try {
      const body = await req.json()
      parsed = loginSchema.parse({ identifier: body.email ?? body.identifier, password: body.password })
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ success: false, error: 'Missing credentials', code: 'VALIDATION_ERROR' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const credentialInput = parsed.identifier.trim()
    const password = parsed.password

    const db = admin.firestore()

    // 1️⃣ Email login for admin/owner
    if (credentialInput.includes('@')) {
      const userSnap = await db.collection('users')
        .where('email', '==', credentialInput)
        .limit(1)
        .get()

      if (userSnap.empty) return invalidCredentials()
      const userDoc = userSnap.docs[0]
      const data = userDoc.data() || {}
      if (!data.password) return serverError('Password not set')
      if (!(await bcrypt.compare(password, data.password))) return invalidCredentials()
      if (typeof data.account_id !== 'number') return serverError('Account link missing')

      return sendToken(userDoc.id, data.account_id, data.role || 'admin', data.username, credentialInput)
    }

    // 2️⃣ Username login for admin/owner
    let userSnap = await db.collection('users')
      .where('username_lower', '==', credentialInput.toLowerCase())
      .limit(1)
      .get()
    if (userSnap.empty) {
      userSnap = await db.collection('users')
        .where('username', '==', credentialInput)
        .limit(1)
        .get()
    }
    if (!userSnap.empty) {
      const userDoc = userSnap.docs[0]
      const data = userDoc.data() || {}
      if (!data.password) return serverError('Password not set')
      if (!(await bcrypt.compare(password, data.password))) return invalidCredentials()
      if (typeof data.account_id !== 'number') return serverError('Account link missing')
      const role = data.role || 'admin'
      return sendToken(userDoc.id, data.account_id, role, data.username, data.email)
    }

    // 3️⃣ Staff login (waiter/kitchen)
    const staffSnap = await db.collection('staff_users')
      .where('username_lower', '==', credentialInput.toLowerCase())
      .limit(1)
      .get()
    if (staffSnap.empty) return invalidCredentials()

    const staffDoc = staffSnap.docs[0]
    const staffData = staffDoc.data() || {}
    if (staffData.active === false) return NextResponse.json({ success: false, error: 'Account disabled' }, { status: 403 })
    if (!staffData.password) return serverError('Password not set')
    if (!(await bcrypt.compare(password, staffData.password))) return invalidCredentials()
    if (typeof staffData.account_id !== 'number') return serverError('Account link missing')

    const role = staffData.role || 'waiter'
    const email = `${credentialInput}@staff.local` // synthetic email for token
    const sub = `staff-${staffData.id}`

    return sendToken(sub, staffData.account_id, role, staffData.username, email, true)
  } catch (err) {
    console.error('[AUTH][LOGIN] Error', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// ---------------- Helper functions ----------------
function sendToken(
  sub: string,
  accountId: number,
  role: string,
  username: string,
  email: string,
  staff = false
) {
  const token = createToken({
    sub,
    email,
    accountId: String(accountId),
    accountNumericId: accountId,
    role,
    username,
  })
  const res = NextResponse.json({
    success: true,
    user: { id: sub, email, account_id: accountId, role, username, staff },
  })
  res.cookies.set('auth_token', token, cookieOpts())
  return res
}

function invalidCredentials() {
  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
}

function serverError(msg: string) {
  return NextResponse.json({ success: false, error: msg }, { status: 500 })
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
