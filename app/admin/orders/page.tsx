"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useOrdersStream } from "@/hooks/use-orders-stream"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, LayoutGrid, List as ListIcon, Rows3 } from "lucide-react"
import { OrdersSkeletonGrid } from './components/order-skeleton'
import { AdminOrderCard } from './components/order-card'
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminActionOverlay } from "@/components/admin-action-overlay"
import { useAdminActionOverlay } from "@/hooks/use-admin-action"
import { useSystemActive } from "@/hooks/use-system-active"
import { handleSystemInactive } from "@/lib/system-active"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminOrdersTexts } from "@/lib/i18n/admin-orders"
import { notify } from '@/lib/notifications/facade'

interface Order { id:number; table_id:number; status:string; total:number; created_at:string; updated_at:string; note?:string; daily_number?:number }
interface OrderItem { id:number; product_id:number; product_name?:string; quantity:number; price:number }

export default function AdminOrdersPage() {
  const router = useRouter()
  const language = useAdminLanguage()
  const L = getAdminOrdersTexts(language as 'ar'|'fr'|'en')
  const [orders,setOrders] = useState<Order[]>([])
  const [loading,setLoading] = useState(false)
  const [statusFilter,setStatusFilter] = useState<string>("")
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'compact'>(()=> {
    if (typeof window === 'undefined') return 'cards'
    const stored = localStorage.getItem('orders:viewMode')
    return stored === 'cards' || stored === 'list' || stored === 'compact' ? stored : 'cards'
  })
  const [actionLoading,setActionLoading] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const action = useAdminActionOverlay(language)
  const systemActive = useSystemActive(true)
  
  const stream = useOrdersStream({ 
    status: statusFilter || undefined
  })

  // Initial + manual fetch (fallback before SSE populates or on refresh / filter change)
  const fetchOrders = useCallback(async (manual = false) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      const res = await fetch(`/api/orders?${qs.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load orders')
      const list: Order[] = Array.isArray(json.data) ? json.data : []
      setOrders(prev => {
        const map = new Map<number, Order>()
        prev.forEach(o => { if (o && typeof o.id === 'number') map.set(o.id, o) })
        list.forEach(o => { if (o && typeof o.id === 'number') map.set(o.id, { ...map.get(o.id), ...o }) })
        return Array.from(map.values())
          .filter(o => o && (!statusFilter || o.status === statusFilter))
          .sort((a,b)=> new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime())
      })
      setError(null)
  if (manual) { notify({ type:'orders.refresh.success' }) }
    } catch (e) {
      console.error('[ORDERS][FETCH] error', e)
  setError(L.orderDeleteFailed)
  notify({ type:'orders.refresh.error' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, language])

  /* -------- Order Detail Caching / Prefetch -------- */
  interface DetailCacheEntry { items: OrderItem[]; note?: string; fetchedAt: number }
  const DETAIL_CACHE_TTL_MS = 20_000 // 20 seconds TTL
  const detailCacheRef = useRef<Map<number, DetailCacheEntry>>(new Map())
  const inFlightRef = useRef<Set<number>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

  const readCache = (id:number) => {
    const entry = detailCacheRef.current.get(id)
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > DETAIL_CACHE_TTL_MS) return entry // stale but usable (SWR)
    return entry
  }

  const fetchAndCache = useCallback(async (id:number, opts?: { force?: boolean; silent?: boolean }) => {
    if (!id) return null
    const cached = readCache(id)
    if (cached && !opts?.force) return cached
    if (inFlightRef.current.has(id)) return cached || null
    try {
      inFlightRef.current.add(id)
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const res = await fetch(`/api/orders/${id}`, { signal: controller.signal })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const entry: DetailCacheEntry = { items: json.data.items || [], note: json.data.order?.note, fetchedAt: Date.now() }
      detailCacheRef.current.set(id, entry)
      setOrders(prev => prev.map(o => o.id===id ? { ...o, note: entry.note } : o))
      return entry
    } catch (e) {
      const err = e as unknown as { name?: string }
      if (err?.name !== 'AbortError') console.warn('[DETAIL] fetch failed', e)
      return null
    } finally {
      inFlightRef.current.delete(id)
    }
  }, [])

  const prefetchDetail = useCallback((id:number) => {
    if (!id) return
    const cached = detailCacheRef.current.get(id)
    if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_TTL_MS) return // fresh
    fetchAndCache(id, { silent: true })
  }, [fetchAndCache])

  // Prefetch top N newest when orders change (initial & updates)
  useEffect(() => {
    const top = orders.slice(0, 6)
    top.forEach(o => prefetchDetail(o.id))
  }, [orders, prefetchDetail])

  // Initial & filter change fetch
  useEffect(()=>{ fetchOrders() },[fetchOrders])

  // Merge stream updates - with safe guards
  useEffect(()=>{
    const live = stream.orderIds
      .map(id => stream.orders[id])
      .filter((order): order is Order => order != null && typeof order.id === 'number')
    
    if (live.length > 0 && stream.state === 'open') {
      setOrders(prev => {
        const map = new Map<number,Order>()
        prev.forEach(o => {
          if (o && typeof o.id === 'number') {
            map.set(o.id, o)
          }
        })
        live.forEach(o => {
          if (o && typeof o.id === 'number') {
            map.set(o.id, { ...map.get(o.id), ...o })
          }
        })
        
        const merged = Array.from(map.values())
          .filter(o => o && (!statusFilter || o.status === statusFilter))
          .sort((a,b) => {
            const timeA = new Date(a.created_at || 0).getTime()
            const timeB = new Date(b.created_at || 0).getTime()
            return timeB - timeA // newest first
          })
        
        return merged
      })
    }
  },[stream.orderIds, stream.orders, stream.state, statusFilter])
  
  // Separate effect for loading state
  useEffect(() => {
    if (stream.state === 'open' && loading) {
      setLoading(false)
    }
  }, [stream.state, loading])

  // Removed unused helper nextStatuses (TS lint cleanup)

  const transition = async (id:number, newStatus:string) => {
    if (!id || !newStatus) return
    
    try {
      if (!systemActive) { handleSystemInactive(language); return }
      setActionLoading(true)
  action.start(L.updateOrderProgress, L.updateOrderProgress)
      const res = await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status:newStatus }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setOrders(prev => prev
        .map(o => o && o.id === id ? { ...o, status:newStatus, updated_at: json.data.updated_at } : o)
        .filter(o => o && !(o.id === id && newStatus === 'served'))
      )
  action.success(L.updateOrderSuccess, L.updateOrderSuccess)
  notify({ type:'orders.status.update.success' })
    } catch (err) {
      console.error('Transition error:', err)
    setError(L.statusUpdateFailed)
  action.error(L.actionFailed, L.actionFailed)
  notify({ type:'orders.status.update.error' })
    } finally { 
      setActionLoading(false) 
    }
  }

  const removeOrder = async (id:number) => {
    if (!id || !confirm(L.confirmDelete)) return
    
    try {
      if (!systemActive) { handleSystemInactive(language); return }
      setActionLoading(true)
  action.start(L.archiveOrderProgress, L.archiveOrderProgress)
      const res = await fetch(`/api/orders/${id}`, { method:"DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setOrders(prev => prev.filter(o => o && o.id !== id))
  action.success(L.archiveOrderSuccess, L.archiveOrderSuccess)
  notify({ type:'orders.archive.success' })
      
    } catch (err) {
      console.error('Delete error:', err)
    setError(L.deleteOrderFailed)
  action.error(L.archiveOrderFailed, L.archiveOrderFailed)
  notify({ type:'orders.archive.error' })
    } finally { 
      setActionLoading(false) 
    }
  }

  // Derived counts per status for filter pills
  const statusCounts = useMemo(()=>{
    const counts: Record<string, number> = { all: 0, pending:0, approved:0, ready:0, served:0 }
    orders.forEach(o=> { counts.all++; if(counts[o.status] != null) counts[o.status]++ })
    return counts
  }, [orders])

  useEffect(()=> { try { localStorage.setItem('orders:viewMode', viewMode) } catch {} }, [viewMode])

  const filteredOrders = statusFilter ? orders.filter(o=> o.status === statusFilter) : orders

  const isListLike = viewMode !== 'cards'

  return (
    <AdminLayout>
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AdminHeader 
          title={L.title}
          showBackButton={true}
          onBackClick={() => router.push('/admin/dashboard')}
        />
        <div className="p-4 pb-20 space-y-6">
          <AdminActionOverlay state={action.state} language={action.language} onClear={action.clear} />
          
          {/* Header Section with Actions */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-5 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                  {L.manageOrders}
                </h1>
                <p className="text-sm text-slate-500">{L.filterByStatus}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md overflow-hidden border border-slate-200 bg-white">
                  <Button size="icon" aria-label="Cards" variant={viewMode==='cards'? 'default':'ghost'} className="h-8 w-8" onClick={()=> setViewMode('cards')}><LayoutGrid className="h-4 w-4" /></Button>
                  <Button size="icon" aria-label="List" variant={viewMode==='list'? 'default':'ghost'} className="h-8 w-8" onClick={()=> setViewMode('list')}><ListIcon className="h-4 w-4" /></Button>
                  <Button size="icon" aria-label="Compact" variant={viewMode==='compact'? 'default':'ghost'} className="h-8 w-8" onClick={()=> setViewMode('compact')}><Rows3 className="h-4 w-4" /></Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={()=>fetchOrders(true)} 
                  disabled={loading}
                  className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                  {L.refresh}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['', 'pending','approved','ready','served'].map(s=> {
                const active = s===statusFilter
                const label = s? L.status[s as keyof typeof L.status] : L.all
                const count = s? statusCounts[s] : statusCounts.all
                return (
                  <button key={s||'all'} onClick={()=> setStatusFilter(s)} className={"group relative flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition " + (active? 'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white text-slate-600 hover:text-slate-800 border-slate-200 hover:bg-slate-50') }>
                    <span>{label}</span>
                    <span className={"text-xs rounded-full px-2 py-0.5 font-semibold transition " + (active? 'bg-white/20':'bg-slate-100 text-slate-600 group-hover:bg-slate-200')}>{count}</span>
                  </button>
                )
              })}
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { key:'all', label: L.all, count: statusCounts.all, color:'bg-slate-800 text-white' },
                { key:'pending', label: L.status.pending, count: statusCounts.pending, color:'bg-amber-500/90 text-white' },
                { key:'approved', label: L.status.approved, count: statusCounts.approved, color:'bg-blue-600/90 text-white' },
                { key:'ready', label: L.status.ready, count: statusCounts.ready, color:'bg-green-600/90 text-white' },
                { key:'served', label: L.status.served, count: statusCounts.served, color:'bg-slate-500/90 text-white' }
              ].map(s => (
                <div key={s.key} className={"rounded-xl px-3 py-2 flex flex-col gap-1 shadow-sm border border-white/20 backdrop-blur-sm " + s.color}>
                  <span className="text-xs font-medium opacity-90 tracking-wide">{s.label}</span>
                  <span className="text-lg font-semibold leading-none">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {error}
              </div>
            </div>
          )}
          
          {/* Orders Grid */}
          {/* Orders List / Cards */}
          <div className={isListLike? 'space-y-3 animate-in fade-in duration-300':'grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 animate-in fade-in duration-300'}>
            {loading && filteredOrders.length===0 ? (
              <OrdersSkeletonGrid mode={viewMode} />
            ) : filteredOrders.map(o => (
              <AdminOrderCard
                key={o.id}
                order={o}
                items={readCache(o.id)?.items || []}
                language={language}
                onTransition={transition}
                onRemove={removeOrder}
                onLoadDetails={()=>prefetchDetail(o.id)}
                actionLoading={actionLoading}
                L={L}
                mode={viewMode}
              />
            ))}
            
            {/* Empty State */}
            {!loading && filteredOrders.length===0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-slate-400 mb-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-3">
                    📝
                  </div>
                </div>
                <p className="text-slate-500 font-medium">{L.noOrders}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {L.noOrders}
                </p>
              </div>
            )}
            
            {/* Loading State */}
            {loading && filteredOrders.length===0 && (
              <div className="col-span-full flex items-center justify-center gap-3 text-slate-500 text-sm py-12">
                <Loader2 className="h-5 w-5 animate-spin"/> 
                {L.loading}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// Admin Order Card Component
// removed inline AdminOrderCard (moved to components/order-card.tsx)
