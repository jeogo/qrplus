"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { AdminHeader, useAdminLanguage } from '@/components/admin-header'
import { getKitchenTexts } from '@/lib/i18n/kitchen'
import { useSession } from '@/hooks/use-session'
import { toast } from 'sonner'
import { KitchenOrdersList, KitchenStatsHeader, useKitchenOrders, KitchenLoadingSkeleton } from './components'

export default function KitchenPage(){
  const language = useAdminLanguage()
  const { user, loading: sessionLoading } = useSession()
  const [soundEnabled,setSoundEnabled] = useState<boolean>(()=> { if (typeof window==='undefined') return true; try { return localStorage.getItem('kitchen:sound') !== 'off' } catch { return true } })
  const t = useMemo(()=> getKitchenTexts(language), [language])
  const { orders, loading, stats, markReady, cancel, bulkReady } = useKitchenOrders({ language, t, soundEnabled })
  useEffect(()=>{ try { localStorage.setItem('kitchen:sound', soundEnabled? 'on':'off') } catch {} },[soundEnabled])

  useEffect(()=>{ if (!sessionLoading && user && user.role !== 'kitchen') { if (user.role==='admin') window.location.href='/admin/dashboard'; else if (user.role==='waiter') window.location.href='/waiter'; else window.location.href='/auth' } },[user, sessionLoading])

  const formatTimeAgo = (iso:string) => {
    const d = new Date(iso); const diffMin = Math.floor((Date.now()-d.getTime())/60000); if (diffMin < 1) return t.justNow; if (diffMin===1) return `${diffMin} ${t.minute} ${t.ago}`; return `${diffMin} ${t.minutes} ${t.ago}`
  }

  if (loading || sessionLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language==='ar'? 'rtl':'ltr'}`}>
        <AdminHeader title={t.title} />
        <main className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"/>
            <p className="text-slate-500 text-lg">{t.loading}</p>
          </div>
        </main>
      </div>
    )
  }

  const activeOrders = orders.filter(o=> o.status==='approved')

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language==='ar'? 'rtl':'ltr'}`}>
      <AdminHeader title={t.title} />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <KitchenStatsHeader
          language={language as 'ar'|'fr'}
          count={activeOrders.length}
          soundEnabled={soundEnabled}
          onToggleSound={()=> setSoundEnabled(s=> !s)}
          onRefresh={()=> { /* simple refetch */ window.location.reload() }}
          onBulkReady={async ()=> { await bulkReady(); }}
          loading={loading}
          title={t.approvedOrders}
          subtitle={`${activeOrders.length} ${t.ordersToPrep}`}
          bulkLabel={t.markReady}
        />
        {loading ? <KitchenLoadingSkeleton /> : (
          <KitchenOrdersList
            orders={activeOrders}
            language={language as 'ar'|'fr'}
            t={t as any}
            formatTimeAgo={formatTimeAgo}
            onMarkReady={async (id:number)=> { const ok = await markReady(id); if (ok) { toast.success(t.markedReadySuccess) } else { toast.error(t.markedReadyFail) } }}
            onCancel={async (id:number)=> { const ok = await cancel(id); if (ok) { toast.success(t.cancelledSuccess) } else { toast.error(t.cancelledFail) } }}
          />
        )}
      </main>
    </div>
  )
}
