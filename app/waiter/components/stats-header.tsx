"use client"
import { Card, CardContent } from '@/components/ui/card'
import { OrdersQuickActions } from '@/components/orders-quick-actions'
import { useEffect } from 'react'

interface Props {
  language: 'ar' | 'fr' | 'en'
  count: number
  soundEnabled: boolean
  onToggleSound: () => void
  onRefresh: () => void
  onBulkServe: () => Promise<void>
  loading: boolean
  title: string
  subtitle: string
  bulkLabel: string
  viewMode: 'cards' | 'list'
  onChangeView: (m: 'cards' | 'list') => void
}

export function StatsHeader({ language, count, soundEnabled, onToggleSound, onRefresh, onBulkServe, loading, title, subtitle, bulkLabel, viewMode, onChangeView }: Props){
  useEffect(()=>{ try { localStorage.setItem('waiter:viewMode', viewMode) } catch {} },[viewMode])
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">{title}</h2>
            <p className="text-slate-600">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-md overflow-hidden border border-slate-200 bg-white">
              {(['cards','list'] as const).map(m=> (
                <button key={m} aria-label={m} onClick={()=> onChangeView(m)} className={"h-8 px-3 text-sm font-medium transition " + (viewMode===m? 'bg-blue-600 text-white':'text-slate-600 hover:text-slate-800')}>
                  {language==='ar'? (m==='cards'? 'بطاقات':'قائمة') : language==='fr'? (m==='cards'? 'Cartes':'Liste') : (m==='cards'? 'Cards':'List')}
                </button>
              ))}
            </div>
            <OrdersQuickActions
              role="waiter"
              soundEnabled={soundEnabled}
              onToggleSound={onToggleSound}
              onRefresh={onRefresh}
              pendingCount={count}
              onBulkAction={onBulkServe}
              bulkActionLabel={bulkLabel}
              loading={loading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
