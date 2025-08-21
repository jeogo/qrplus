import { describe, it, expect, vi } from 'vitest'
import * as push from '@/lib/notifications/push-sender'
import { sendOrderPush } from '@/services/notification-service'

// Mock underlying push sender functions
vi.mock('@/lib/notifications/push-sender', () => ({
  sendOrderNewPush: vi.fn(async ()=>({ totalMessages:1,totalTokens:3, languageRoleBatches:[{ lang:'fr', role:'kitchen', tokens:3, success:3, failure:0 }] })),
  sendOrderApprovedPush: vi.fn(async ()=>({ totalMessages:1,totalTokens:2, languageRoleBatches:[{ lang:'fr', role:'kitchen', tokens:2, success:2, failure:0 }] })),
  sendOrderReadyPush: vi.fn(async ()=>({ totalMessages:1,totalTokens:1, languageRoleBatches:[{ lang:'fr', role:'waiter', tokens:1, success:1, failure:0 }] })),
  sendOrderServedPush: vi.fn(async ()=>({ totalMessages:1,totalTokens:1, languageRoleBatches:[{ lang:'fr', role:'admin', tokens:1, success:1, failure:0 }] })),
  sendOrderCancelledPush: vi.fn(async ()=>({ totalMessages:1,totalTokens:1, languageRoleBatches:[{ lang:'fr', role:'admin', tokens:1, success:1, failure:0 }] }))
}))

describe('notification-service', () => {
  it('routes approved push', async () => {
    const summary = await sendOrderPush('order.approved', { id:1, table_id:2, account_id:3 })
    expect(summary?.totalTokens).toBe(2)
    expect((push as any).sendOrderApprovedPush).toHaveBeenCalled()
  })
  it('routes cancelled push', async () => {
    const summary = await sendOrderPush('order.cancelled', { id:1, table_id:2, account_id:3 })
    expect(summary?.totalTokens).toBe(1)
    expect((push as any).sendOrderCancelledPush).toHaveBeenCalled()
  })
})
