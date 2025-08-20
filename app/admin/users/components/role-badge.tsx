"use client"
import { Badge } from '@/components/ui/badge'

export function RoleBadge({ role, waiterLabel, kitchenLabel }: { role: 'waiter' | 'kitchen'; waiterLabel: string; kitchenLabel: string }) {
  const isWaiter = role === 'waiter'
  return (
    <Badge variant={isWaiter ? 'default':'secondary'} className={isWaiter? 'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}>
      {isWaiter ? waiterLabel : kitchenLabel}
    </Badge>
  )
}
