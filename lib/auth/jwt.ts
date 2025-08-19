import jwt from 'jsonwebtoken'

// Static secret per user instruction (never expires)
const JWT_SECRET = 'a374b208ca38283500924050679c381e'

export interface AuthTokenPayload {
  sub: string // Firebase UID
  email: string
  accountId: string
  accountNumericId?: number
  role: string
  username?: string
  iat?: number
}

export function createToken(payload: Omit<AuthTokenPayload, 'iat'>): string {
  // No expiration as requested
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', noTimestamp: false })
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
  } catch {
    return null
  }
}
