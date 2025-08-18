import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { createToken, verifyToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    const uid = decoded.sub
    if (!uid) return NextResponse.json({ success: false, error: 'No sub' }, { status: 400 })

    // Read user doc
    const userDoc = await admin.firestore().collection('users').doc(uid).get()
    if (!userDoc.exists) return NextResponse.json({ success: false, error: 'User missing' }, { status: 404 })
    const data = userDoc.data() || {}
    const emailVerified = data.email_verified === true

    if (!emailVerified) {
      return NextResponse.json({ success: true, refreshed: false, emailVerified: false })
    }

    const newToken = createToken({
      sub: uid,
      email: decoded.email,
      accountId: decoded.accountId,
      accountNumericId: decoded.accountNumericId,
      role: decoded.role,
      username: decoded.username,
      emailVerified: true,
    })
    const res = NextResponse.json({ success: true, refreshed: true, emailVerified: true })
    res.cookies.set('auth_token', newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    return res
  } catch (e) {
    console.error('[AUTH][REFRESH_EMAIL_VERIFIED]', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
