// Simple RBAC policy mapping (read-only draft). Will evolve.
export type Role = 'admin' | 'kitchen' | 'waiter'
export type Resource = 'users' | 'orders.list' | 'orders.create' | 'orders.item' | 'orders.item.delete' | 'orders.item.status' | 'orders.stream' | 'orders.details' | 'orders.bulk' | 'orders.ready' | 'products' | 'categories' | 'tables' | 'settings' | 'analytics' | 'maintenance' | 'devices' | 'public.menu' | 'public.status'
export type Action = 'read' | 'create' | 'update' | 'delete' | 'stream' | 'special'

interface Rule { roles: Role[] }

// Base policy matrix
const policy: Record<Resource, Partial<Record<Action, Rule>>> = {
  users: { read: { roles: ['admin'] }, create: { roles: ['admin'] }, update: { roles: ['admin'] }, delete: { roles: ['admin'] } },
  'orders.list': { read: { roles: ['admin'] } },
  'orders.create': { create: { roles: ['admin'] } },
  'orders.item': { read: { roles: ['admin','waiter','kitchen'] } },
  'orders.item.delete': { delete: { roles: ['admin'] } },
  'orders.item.status': { update: { roles: ['admin','waiter','kitchen'] } },
  'orders.stream': { stream: { roles: ['admin', 'kitchen', 'waiter'] } },
  'orders.details': { read: { roles: ['admin', 'kitchen', 'waiter'] } },
  'orders.bulk': { special: { roles: ['admin'] } },
  'orders.ready': { special: { roles: ['admin', 'kitchen'] } },
  products: { read: { roles: ['admin'] }, create: { roles: ['admin'] }, update: { roles: ['admin'] }, delete: { roles: ['admin'] } },
  categories: { read: { roles: ['admin'] }, create: { roles: ['admin'] }, update: { roles: ['admin'] }, delete: { roles: ['admin'] } },
  tables: { read: { roles: ['admin'] }, create: { roles: ['admin'] }, update: { roles: ['admin'] }, delete: { roles: ['admin'] } },
  settings: { read: { roles: ['admin'] }, update: { roles: ['admin'] } },
  analytics: { read: { roles: ['admin'] } },
  maintenance: { special: { roles: ['admin'] } },
  devices: { create: { roles: ['admin', 'kitchen', 'waiter'] } },
  'public.menu': { read: { roles: [] } }, // public implicit
  'public.status': { read: { roles: [] } },
}

export function can(role: Role | undefined, action: Action, resource: Resource): boolean {
  const entry = policy[resource]?.[action]
  if (!entry) return false
  if (entry.roles.length === 0) return true // public
  return !!role && entry.roles.includes(role)
}

export function allowedRoles(resource: Resource, action: Action): Role[] {
  const entry = policy[resource]?.[action]
  return entry?.roles || []
}
