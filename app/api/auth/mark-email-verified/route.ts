import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { verifyToken } from '@/lib/auth/jwt'

// Marks the authenticated user as email_verified in Firestore.
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    const uid = decoded.sub
    if (!uid) return NextResponse.json({ success: false, error: 'No sub' }, { status: 400 })

    const userRef = admin.firestore().collection('users').doc(uid)
    await userRef.set({ email_verified: true, updated_at: new Date().toISOString() }, { merge: true })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[AUTH][MARK_EMAIL_VERIFIED]', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
