import { NextRequest, NextResponse } from 'next/server'
import admin, { adminAuth } from '@/lib/firebase/admin'
import { createToken } from '@/lib/auth/jwt'
import bcrypt from 'bcryptjs'
import { nextSequence } from '@/lib/firebase/sequences'

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const SIGNUP_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = body.username
    const restaurant_name = body.restaurant_name || body.restaurantName || body.name
    const email = body.email
    const password = body.password
    const language = body.language

    if (!username || !restaurant_name || !password) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields (username, restaurant_name, password)'
      }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Weak password (min 6 chars)'
      }, { status: 400 })
    }

    const finalEmail = (email && typeof email === 'string' && /.+@.+\..+/.test(email))
      ? email.trim()
      : `${username.toLowerCase()}-${Date.now()}@placeholder.example.com`

    // Check username uniqueness
    const usernameSnap = await admin.firestore()
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get()
    if (!usernameSnap.empty) {
      return NextResponse.json({ success: false, error: 'Username exists' }, { status: 409 })
    }

    // Try Firebase Admin SDK createUser
    let uid: string
    try {
      const userRecord = await adminAuth.createUser({
        email: finalEmail,
        password,
        displayName: username,
      })
      uid = userRecord.uid
    } catch (adminErr: unknown) {
      const errObj = adminErr as { code?: string }
      if (errObj.code === 'auth/email-already-exists') {
        return NextResponse.json({ success: false, error: 'Email exists' }, { status: 409 })
      }
      // Fallback REST sign-up
      try {
        const fbRes = await fetch(SIGNUP_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: finalEmail, password, returnSecureToken: true })
        })
        const fbJson = await fbRes.json()
        if (!fbRes.ok) {
          return NextResponse.json({
            success: false,
            error: mapFirebaseError(fbJson.error?.message),
            details: fbJson.error?.message
          }, { status: 400 })
        }
        uid = fbJson.localId
      } catch (restErr) {
        console.error('[AUTH][REGISTER] fallback REST error', restErr)
        return NextResponse.json({
          success: false,
          error: 'Registration failed (auth)',
          details: String(restErr)
        }, { status: 500 })
      }
    }

    const now = new Date().toISOString()
    const accountIdNum = await nextSequence('accounts')
    const userIdNum = await nextSequence('users')
    const systemSettingId = await nextSequence('system_settings')

    // Create account
    await admin.firestore().collection('accounts').doc(String(accountIdNum)).set({
      id: accountIdNum,
      name: restaurant_name,
      email: finalEmail,
      start_date: now,
      end_date: now,
      active: true,
      created_at: now,
      updated_at: now,
    })

    // System settings
    await admin.firestore().collection('system_settings').doc(String(systemSettingId)).set({
      id: systemSettingId,
      account_id: accountIdNum,
      logo_url: '',
      language: (language === 'fr' ? 'fr' : 'ar'),
      currency: 'DZD',
      tax: 0,
      created_at: now,
      updated_at: now,
    })

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    await admin.firestore().collection('users').doc(uid).set({
      id: userIdNum,
      account_id: accountIdNum,
      username,
      username_lower: username.toLowerCase(),
      email: finalEmail,
      password: hashedPassword,
      role: 'admin',
      created_at: now,
      updated_at: now,
    })

    // JWT token
    const token = createToken({
      sub: uid,
      email: finalEmail,
      accountId: String(accountIdNum),
      accountNumericId: accountIdNum,
      role: 'admin',
      username
    })

    const res = NextResponse.json({
      success: true,
      user: {
        id: userIdNum,
        firebase_uid: uid,
        email: finalEmail,
        account_id: accountIdNum,
        role: 'admin',
        username
      }
    })
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })

    return res

  } catch (err) {
    console.error('[AUTH][REGISTER] Error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

function mapFirebaseError(code?: string): string {
  switch (code) {
    case 'EMAIL_EXISTS': return 'Email exists'
    case 'INVALID_EMAIL': return 'Invalid email'
    case 'OPERATION_NOT_ALLOWED': return 'Operation not allowed'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER': return 'Too many attempts, try later'
    default: return 'Registration failed'
  }
}
