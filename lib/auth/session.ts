import { cookies } from 'next/headers'
import { verifyToken, AuthTokenPayload } from '@/lib/auth/jwt'

export interface SessionContext extends AuthTokenPayload {
  accountNumericId?: number
}

export async function getSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return payload
}

export async function requireSession(): Promise<SessionContext> {
  const sess = await getSession()
  if (!sess) {
    const err = new Error('Unauthenticated') as Error & { status?: number }
    err.status = 401
    throw err
  }
  return sess
}
