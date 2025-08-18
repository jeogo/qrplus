import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { createToken } from '@/lib/auth/jwt'
import bcrypt from 'bcryptjs'

// Firebase REST sign-in no longer used (custom bcrypt auth)

export async function POST(req: NextRequest) {
  try {
    const { email: usernameOrEmail, password } = await req.json()
    if (!usernameOrEmail || !password) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }

    const credentialInput = String(usernameOrEmail)

    // 1. Attempt normal (owner/admin) user login
    if (credentialInput.includes('@')) {
      // Lookup by email directly
      const userQuery = await admin.firestore().collection('users').where('email', '==', credentialInput).limit(1).get()
      if (userQuery.empty) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
      }
      const userDoc = userQuery.docs[0]
      const data = userDoc.data() || {}
      const storedHash = data.password
      if (!storedHash || typeof storedHash !== 'string') return NextResponse.json({ success: false, error: 'Password not set' }, { status: 500 })
      const ok = await bcrypt.compare(password, storedHash)
      if (!ok) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
      const account_id: number | undefined = data.account_id
      if (typeof account_id !== 'number') return NextResponse.json({ success: false, error: 'Account link missing' }, { status: 500 })
  const token = createToken({ sub: userDoc.id, email: credentialInput, accountId: String(account_id), accountNumericId: account_id, role: data.role || 'admin', username: data.username, emailVerified: data.email_verified === true })
      const res = NextResponse.json({ success: true, user: { id: data.id, firebase_uid: userDoc.id, email: credentialInput, account_id, role: data.role || 'admin', username: data.username } })
      res.cookies.set('auth_token', token, cookieOpts())
      return res
    }

    // 2. Username path: first try primary users collection by username
    const usersCol = admin.firestore().collection('users')
    let userQuerySnap = await usersCol.where('username_lower', '==', credentialInput.toLowerCase()).limit(1).get()
    if (userQuerySnap.empty) {
      userQuerySnap = await usersCol.where('username', '==', credentialInput).limit(1).get()
    }
    if (!userQuerySnap.empty) {
      const doc = userQuerySnap.docs[0]
      const data = doc.data() || {}
      const email = data.email
      const storedHash = data.password
      if (!email || typeof email !== 'string') return NextResponse.json({ success: false, error: 'Account email missing' }, { status: 500 })
      if (!storedHash || typeof storedHash !== 'string') return NextResponse.json({ success: false, error: 'Password not set' }, { status: 500 })
      const ok = await bcrypt.compare(password, storedHash)
      if (!ok) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
      const account_id: number | undefined = data.account_id
      if (typeof account_id !== 'number') return NextResponse.json({ success: false, error: 'Account link missing' }, { status: 500 })
      const role: string = data.role || 'admin'
  const token = createToken({ sub: doc.id, email, accountId: String(account_id), accountNumericId: account_id, role, username: data.username, emailVerified: data.email_verified === true })
      const res = NextResponse.json({ success: true, user: { id: data.id, firebase_uid: doc.id, email, account_id, role, username: data.username } })
      res.cookies.set('auth_token', token, cookieOpts())
      return res
    }

    // 3. Fallback: staff user (waiter/kitchen) login from staff_users collection
    const staffSnap = await admin.firestore().collection('staff_users')
      .where('username_lower', '==', credentialInput.toLowerCase())
      .limit(1)
      .get()
    if (staffSnap.empty) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }
    const staffDoc = staffSnap.docs[0]
    const staffData = staffDoc.data() || {}
    if (staffData.active === false) {
      return NextResponse.json({ success: false, error: 'Account disabled' }, { status: 403 })
    }
    const staffHash = staffData.password
    if (!staffHash || typeof staffHash !== 'string') return NextResponse.json({ success: false, error: 'Password not set' }, { status: 500 })
    const staffOk = await bcrypt.compare(password, staffHash)
    if (!staffOk) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    const staffAccount: number | undefined = staffData.account_id
    if (typeof staffAccount !== 'number') return NextResponse.json({ success: false, error: 'Account link missing' }, { status: 500 })
    const role: string = staffData.role || 'waiter'
    const email = `${credentialInput}@staff.local` // synthetic (not used for contact)
    const sub = `staff-${staffData.id}`
  const token = createToken({ sub, email, accountId: String(staffAccount), accountNumericId: staffAccount, role, username: staffData.username, emailVerified: true })
    const res = NextResponse.json({ success: true, user: { id: staffData.id, email, account_id: staffAccount, role, username: staffData.username, staff: true } })
    res.cookies.set('auth_token', token, cookieOpts())
    return res
  } catch (err) {
    console.error('[AUTH][LOGIN] Error', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

// Firebase REST no longer used after switching to custom hashed login
