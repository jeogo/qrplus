// Central order status definitions & transition validation
// Extendable for future statuses (e.g., canceled, archived)

export type OrderStatus = 'pending' | 'approved' | 'ready' | 'served'

// Allowed next transitions map
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved'],
  approved: ['ready'],
  ready: ['served'],
  served: []
}

export function validateTransition(current: string, next: string): next is OrderStatus {
  if (!isOrderStatus(current) || !isOrderStatus(next)) return false
  return NEXT[current].includes(next)
}

export function isOrderStatus(v: string): v is OrderStatus {
  return v === 'pending' || v === 'approved' || v === 'ready' || v === 'served'
}

export function isFinalStatus(status: string): boolean {
  return status === 'served' // adjust when adding more finals
}
