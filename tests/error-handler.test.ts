import { describe, it, expect } from 'vitest'
import { AppError, ValidationError, AuthError } from '@/lib/errors'
import { toErrorResponse } from '@/lib/api/error-handler'

describe('toErrorResponse', () => {
  it('serializes AppError subclasses', () => {
    const err = new ValidationError('INVALID_ITEMS')
    const res = toErrorResponse(err)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('INVALID_ITEMS')
  })
  it('maps auth error message', () => {
    const err = new AuthError()
    const res = toErrorResponse(err)
    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Unauthenticated')
  })
  it('defaults unknown error', () => {
    const err = new Error('boom')
    const res = toErrorResponse(err)
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('SERVER_ERROR')
    expect(res.body.error.message).toBe('Server error')
  })
})
