import { describe, it, expect, vi } from 'vitest'
import { notify } from '@/lib/notifications/facade'

// Mock adapters
vi.mock('@/lib/notifications/adapters/sonner', () => ({ showToast: vi.fn() }))
vi.mock('@/lib/notifications/preferences', () => ({
  loadUnifiedPrefs: () => ({
    ui: { enableToasts: true, durationMs: 1000 },
    sound: { enabled: false },
    categories: { action:true, domain:true, system:true, error:true, progress:true },
    roles: { admin:{ newOrder:true, approved:true, ready:true, served:true, cancelled:true }, kitchen:{ newOrder:true, approved:true, ready:true, served:true, cancelled:true }, waiter:{ newOrder:true, approved:true, ready:true, served:true, cancelled:true } },
    dedupe: { windowDomainMs: 5000 },
  })
}))

describe('notifications dedupe', () => {
  it('dedupes within window', () => {
    const first = notify({ type:'auth.login.success' })
    const second = notify({ type:'auth.login.success' })
    expect(first).toBeTruthy()
    expect(second).toBeUndefined()
  })
})
