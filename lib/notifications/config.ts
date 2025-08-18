// Notification configuration: which roles get which event types.
export type OrderEventKind = 'order.created' | 'order.updated' | 'order.deleted'
export type OrderStatus = 'pending' | 'approved' | 'ready' | 'served'

export interface NotificationPreferences {
  enableToasts: boolean
  enableSound: boolean
  dedupeMs: number
  roles: {
  admin: { newOrder: boolean; approved: boolean; ready: boolean; served: boolean; cancelled: boolean }
  kitchen: { newOrder: boolean; approved: boolean; ready: boolean; cancelled: boolean }
  waiter: { ready: boolean; served: boolean; cancelled: boolean }
  }
}

export const defaultNotificationPreferences: NotificationPreferences = {
  enableToasts: true,
  enableSound: true,
  dedupeMs: 12000,
  roles: {
  admin: { newOrder: true, approved: true, ready: true, served: false, cancelled: true },
  kitchen: { newOrder: true, approved: true, ready: false, cancelled: true },
  waiter: { ready: true, served: false, cancelled: true }
  }
}
