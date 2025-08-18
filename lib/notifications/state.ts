import { defaultNotificationPreferences, NotificationPreferences } from './config'

// Bump key when structure changes. v2 adds approved/cancelled flags.
const LS_KEY = 'notification_prefs_v2'

export function loadNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return defaultNotificationPreferences
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultNotificationPreferences
    const parsed = JSON.parse(raw)
    // Deep merge to preserve newly added nested flags
    const base = defaultNotificationPreferences
    const roles = {
      admin: { ...base.roles.admin, ...(parsed.roles?.admin || {}) },
      kitchen: { ...base.roles.kitchen, ...(parsed.roles?.kitchen || {}) },
      waiter: { ...base.roles.waiter, ...(parsed.roles?.waiter || {}) },
    }
    return {
      enableToasts: parsed.enableToasts ?? base.enableToasts,
      enableSound: parsed.enableSound ?? base.enableSound,
      dedupeMs: parsed.dedupeMs ?? base.dedupeMs,
      roles,
    }
  } catch {
    return defaultNotificationPreferences
  }
}

export function saveNotificationPrefs(p: NotificationPreferences) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p))
  } catch {}
}
