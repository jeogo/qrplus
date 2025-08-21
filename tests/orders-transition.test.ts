import { assertTransition, canRoleTransition } from '@/services/orders-transition'
import { describe, it, expect } from 'vitest'

describe('orders transition gating', () => {
  it('allows approved -> ready for kitchen', () => {
    expect(canRoleTransition('kitchen','approved','ready').valid).toBe(true)
  })
  it('denies kitchen ready -> served', () => {
    expect(canRoleTransition('kitchen','ready','served').valid).toBe(false)
  })
  it('allows ready -> served for waiter', () => {
    expect(canRoleTransition('waiter','ready','served').valid).toBe(true)
  })
  it('denies waiter approved -> ready', () => {
    expect(canRoleTransition('waiter','approved','ready').valid).toBe(false)
  })
  it('throws on invalid graph transition', () => {
    expect(()=>assertTransition('admin','pending','ready')).toThrow()
  })
})
