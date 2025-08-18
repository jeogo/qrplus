import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 })
  }
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
  }
  return NextResponse.json({ success: true, user: payload })
}
