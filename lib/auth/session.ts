import { cookies } from 'next/headers'
import { verifyToken, AuthTokenPayload } from '@/lib/auth/jwt'

export interface SessionContext extends AuthTokenPayload {
  accountNumericId?: number
}

export function getSession(): SessionContext | null {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return payload
}

export function requireSession(): SessionContext {
  const sess = getSession()
  if (!sess) {
    const err = new Error('Unauthenticated') as Error & { status?: number }
    err.status = 401
    throw err
  }
  return sess
}
