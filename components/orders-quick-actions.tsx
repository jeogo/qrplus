"use client"
import { Button } from '@/components/ui/button'
import { RefreshCw, Volume2, VolumeX, CheckCircle, ChefHat } from 'lucide-react'
import React from 'react'

interface OrdersQuickActionsProps {
  role: 'kitchen' | 'waiter'
  soundEnabled: boolean
  onToggleSound: () => void
  onRefresh: () => void
  pendingCount: number
  onBulkAction?: () => void
  bulkActionLabel?: string
  loading?: boolean
}

export function OrdersQuickActions({ role, soundEnabled, onToggleSound, onRefresh, pendingCount, onBulkAction, bulkActionLabel, loading }: OrdersQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button onClick={onRefresh} variant="outline" size="sm" className="flex items-center gap-1">
        <RefreshCw className="h-4 w-4" />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
      <Button onClick={onToggleSound} variant="outline" size="sm" className={`flex items-center gap-1 ${soundEnabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}> 
        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
      </Button>
      {onBulkAction && pendingCount > 0 && (
        <Button onClick={onBulkAction} size="sm" className="flex items-center gap-1 bg-primary text-white hover:bg-primary/90">
          {role === 'kitchen' ? <ChefHat className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <span className="hidden sm:inline">{bulkActionLabel}</span>
          <span className="text-xs font-semibold">({pendingCount})</span>
        </Button>
      )}
      {loading && <span className="text-xs text-muted-foreground ml-1 animate-pulse">Updating…</span>}
    </div>
  )
}
