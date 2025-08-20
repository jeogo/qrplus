"use client"
import { Card, CardContent } from '@/components/ui/card'
import { OrdersQuickActions } from '@/components/orders-quick-actions'
import { useEffect } from 'react'

interface Props {
  count: number
  soundEnabled: boolean
  onToggleSound: () => void
  onRefresh: () => void
  loading: boolean
  title: string
  subtitle: string
}

export function KitchenStatsHeader({ count, soundEnabled, onToggleSound, onRefresh, loading, title, subtitle }: Props){
  useEffect(()=>{ try { localStorage.setItem('kitchen:lastCount', String(count)) } catch {} },[count])
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">{title}</h2>
            <p className="text-slate-600">{subtitle}</p>
          </div>
          <OrdersQuickActions
            role="kitchen"
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            onRefresh={onRefresh}
            pendingCount={count}
            loading={loading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
