"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
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
          language={language as 'ar'|'fr'}
          count={activeOrders.length}
          soundEnabled={soundEnabled}
          onToggleSound={()=> setSoundEnabled(s=> !s)}
          onRefresh={()=> void refresh()}
          onBulkServe={async ()=> { for (const o of activeOrders) { const ok = await serve(o.id); if (ok) { toast.success(t.servedSuccess) } else { toast.error(t.serveFailed) } } }}
          loading={refreshing}
          title={language==='ar'? 'طلبات جاهزة':'Ready Orders'}
          subtitle={`${activeOrders.length} ${language==='ar'? 'طلب جاهز للتقديم':'orders ready to serve'}`}
          bulkLabel={t.serve}
          viewMode={viewMode}
          onChangeView={setViewMode}
        />
        <OrdersList
          orders={activeOrders}
          language={language as 'ar'|'fr'}
          viewMode={viewMode}
          t={t}
          formatTimeAgo={formatTimeAgo}
          onServe={async (id:number)=> { const ok = await serve(id); if (ok) { toast.success(t.servedSuccess) } else { toast.error(t.serveFailed) } }}
          onCancel={async (id:number)=> { const ok = await cancel(id); if (ok) { toast.success(t.cancelledSuccess) } else { toast.error(t.cancelFailed) } }}
        />
        <button
          onClick={async ()=> { const ok = await logout(); if (ok) { toast.success(language==='ar'? 'تم تسجيل الخروج':'Déconnecté'); window.location.href='/auth' } else { toast.error(language==='ar'? 'فشل تسجيل الخروج':'Échec déconnexion') } }}
          className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center focus:outline-none"
          aria-label={language==='ar'? 'تسجيل الخروج':'Logout'}
        >
          <LogOut className="h-6 w-6" />
        </button>
      </main>
    </div>
  )
}
