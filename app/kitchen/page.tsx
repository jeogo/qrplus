"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { AdminHeader, useAdminLanguage } from '@/components/admin-header'
import { getKitchenTexts } from '@/lib/i18n/kitchen'
import { useSession } from '@/hooks/use-session'
import { toast } from 'sonner'
import { KitchenOrdersList, KitchenStatsHeader, useKitchenOrders, KitchenLoadingSkeleton } from './components'
import { logout } from '@/lib/auth/session-client'
import { LogOut } from 'lucide-react'

export default function KitchenPage(){
  const language = useAdminLanguage()
  const { user, loading: sessionLoading } = useSession()
  const [soundEnabled,setSoundEnabled] = useState<boolean>(()=> { if (typeof window==='undefined') return true; try { return localStorage.getItem('kitchen:sound') !== 'off' } catch { return true } })
  const t = useMemo(()=> getKitchenTexts(language), [language])
  const { orders, loading, markReady, cancel } = useKitchenOrders({ t, soundEnabled })
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
          count={activeOrders.length}
          soundEnabled={soundEnabled}
          onToggleSound={()=> setSoundEnabled(s=> !s)}
          onRefresh={()=> { /* simple refetch */ window.location.reload() }}
          loading={loading}
          title={t.approvedOrders}
          subtitle={`${activeOrders.length} ${t.ordersToPrep}`}
        />
        {loading ? <KitchenLoadingSkeleton /> : (
          <KitchenOrdersList
            orders={activeOrders}
            language={language as 'ar'|'fr'}
            t={t}
            formatTimeAgo={formatTimeAgo}
            onMarkReady={async (id:number)=> { const ok = await markReady(id); if (ok) { toast.success(t.markedReadySuccess) } else { toast.error(t.markedReadyFail) } }}
            onCancel={async (id:number)=> { const ok = await cancel(id); if (ok) { toast.success(t.cancelledSuccess) } else { toast.error(t.cancelledFail) } }}
          />
        )}
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
