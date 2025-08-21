"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { notify } from '@/lib/notifications/facade'
import { AdminHeader, useAdminLanguage } from '@/components/admin-header'
import { getWaiterTexts } from '@/lib/i18n/waiter'
import { useSession } from '@/hooks/use-session'
import { StatsHeader, WaiterLoadingSkeleton, OrdersList, useWaiterOrders, Order } from './components'
import { logout } from '@/lib/auth/session-client'
import { LogOut } from 'lucide-react'

export default function WaiterPage(){
  const language = useAdminLanguage()
  const { user, loading: sessionLoading } = useSession()
  const [soundEnabled,setSoundEnabled] = useState<boolean>(()=>{ if (typeof window==='undefined') return true; try { return localStorage.getItem('waiter:sound') !== 'off' } catch { return true } })
  const [viewMode,setViewMode] = useState<'cards'|'list'>(()=> { if (typeof window==='undefined') return 'cards'; const v = localStorage.getItem('waiter:viewMode'); return v==='list' ? 'list' : 'cards' })
  const t = useMemo(()=> getWaiterTexts(language), [language])
  const { orders, loading, refreshing, refresh, serve, cancel } = useWaiterOrders(user, soundEnabled)

  useEffect(()=>{ if (!sessionLoading && user && user.role !== 'waiter') { if (user.role==='admin') window.location.href='/admin/dashboard'; else if (user.role==='kitchen') window.location.href='/kitchen'; else window.location.href='/auth' } },[user, sessionLoading])
  useEffect(()=>{ try { localStorage.setItem('waiter:sound', soundEnabled? 'on':'off') } catch {} },[soundEnabled])

  const formatTimeAgo = (iso:string) => {
    const date = new Date(iso)
    const diffMinutes = Math.floor((Date.now() - date.getTime())/60000)
    if (diffMinutes < 1) return t.justNow
    if (diffMinutes === 1) return `${diffMinutes} ${t.minute} ${t.ago}`
    return `${diffMinutes} ${t.minutes} ${t.ago}`
  }

  const activeOrders = orders.filter((o:Order)=> o.status==='ready')

  if (loading || sessionLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language==='ar'? 'rtl':'ltr'}`}>
        <AdminHeader title={t.title} />
        <main className="container mx-auto px-4 py-6 space-y-6">
          <WaiterLoadingSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language==='ar'? 'rtl':'ltr'}`}>
      <AdminHeader title={t.title} />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <StatsHeader
          language={language as 'ar'|'fr'|'en'}
          count={activeOrders.length}
          soundEnabled={soundEnabled}
          onToggleSound={()=> setSoundEnabled(s=> !s)}
          onRefresh={()=> void refresh()}
          onBulkServe={async ()=> { for (const o of activeOrders) { const ok = await serve(o.id); if (ok) { notify({ type:'waiter.order.serve.success' }) } else { notify({ type:'waiter.order.serve.error' }) } } }}
          loading={refreshing}
          title={t.readyOrdersTitle || t.orderReady}
          subtitle={`${activeOrders.length} ${t.readyOrdersSubtitle || t.orderReady}`}
          bulkLabel={t.serve}
          viewMode={viewMode}
          onChangeView={setViewMode}
        />
        <OrdersList
          orders={activeOrders}
          language={language as 'ar'|'fr'|'en'}
          viewMode={viewMode}
          t={t}
          formatTimeAgo={formatTimeAgo}
          onServe={async (id:number)=> { const ok = await serve(id); if (ok) { notify({ type:'waiter.order.serve.success' }) } else { notify({ type:'waiter.order.serve.error' }) } }}
          onCancel={async (id:number)=> { const ok = await cancel(id); if (ok) { notify({ type:'waiter.order.cancel.success' }) } else { notify({ type:'waiter.order.cancel.error' }) } }}
        />
        <button
          onClick={async ()=> { const ok = await logout(); if (ok) { notify({ type:'logout.success' }); window.location.href='/auth' } else { notify({ type:'logout.error' }) } }}
          className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center focus:outline-none"
          aria-label={t.logout || 'Logout'}
        >
          <LogOut className="h-6 w-6" />
        </button>
      </main>
    </div>
  )
}
