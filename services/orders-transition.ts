import { isOrderStatus, validateTransition } from '@/lib/order-status'
import { ForbiddenError, ValidationError } from '@/lib/errors'

export interface TransitionContext { role: string }

export interface TransitionResult { valid: boolean; reason?: string }

// Role-based transition gating separate from status graph
export function canRoleTransition(role: string, current: string, next: string): TransitionResult {
  if (!isOrderStatus(current) || !isOrderStatus(next)) return { valid:false, reason:'INVALID_STATUS' }
  if (!validateTransition(current, next)) return { valid:false, reason:'INVALID_TRANSITION' }
  if (role === 'waiter') {
    if (!(current === 'ready' && next === 'served')) return { valid:false, reason:'FORBIDDEN_TRANSITION' }
  } else if (role === 'kitchen') {
    if (!(current === 'approved' && next === 'ready')) return { valid:false, reason:'FORBIDDEN_TRANSITION' }
  }
  return { valid:true }
}

export function assertTransition(role: string, current: string, next: string){
  const res = canRoleTransition(role, current, next)
  if (!res.valid) {
    if (res.reason === 'INVALID_STATUS' || res.reason === 'INVALID_TRANSITION') throw new ValidationError(res.reason)
    throw new ForbiddenError(res.reason || 'FORBIDDEN_TRANSITION')
  }
}
