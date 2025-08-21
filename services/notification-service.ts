import { sendOrderApprovedPush, sendOrderReadyPush, sendOrderServedPush, sendOrderCancelledPush, sendOrderNewPush } from '@/lib/notifications/push-sender'
import { pushBatchesCounter, pushTokensCounter, pushFailedBatchesCounter } from '@/lib/observability/metrics'

export type OrderPushKind = 'order.new'|'order.approved'|'order.ready'|'order.served'|'order.cancelled'

export interface PushSummary { totalMessages: number; totalTokens: number; languageRoleBatches: Array<{ lang:string; role:string; tokens:number; success:number; failure:number }> }

export async function sendOrderPush(kind: OrderPushKind, order: { id:number; table_id:number; daily_number?: number; account_id?: number }) {
  let summary: PushSummary | null = null
  switch (kind) {
    case 'order.new': summary = await sendOrderNewPush(order); break
    case 'order.approved': summary = await sendOrderApprovedPush(order); break
    case 'order.ready': summary = await sendOrderReadyPush(order); break
    case 'order.served': summary = await sendOrderServedPush(order); break
    case 'order.cancelled': summary = await sendOrderCancelledPush(order); break
  }
  if (summary) {
    pushBatchesCounter.inc({ kind }, summary.languageRoleBatches.length)
    pushTokensCounter.inc({ kind }, summary.totalTokens)
    const failedBatches = summary.languageRoleBatches.filter(b=>b.failure>0).length
    if (failedBatches) pushFailedBatchesCounter.inc({ kind }, failedBatches)
  }
  return summary
}
