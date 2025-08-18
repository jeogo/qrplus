"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useOrdersStream } from "@/hooks/use-orders-stream"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, RefreshCw, Trash2 } from "lucide-react"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminActionOverlay } from "@/components/admin-action-overlay"
import { useAdminActionOverlay } from "@/hooks/use-admin-action"
import { useSystemActive } from "@/hooks/use-system-active"
import { handleSystemInactive } from "@/lib/system-active"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminOrdersTexts } from "@/lib/i18n/admin-orders"

interface Order { id:number; table_id:number; status:string; total:number; created_at:string; updated_at:string; note?:string; daily_number?:number }
interface OrderItem { id:number; product_id:number; product_name?:string; quantity:number; price:number }

const STATUS_FLOW: Record<string,string[]> = { pending:['approved'], approved:['ready'], ready:['served'], served:[] }
const STATUS_COLOR: Record<string,string> = { pending:"bg-yellow-100 text-yellow-800", approved:"bg-blue-100 text-blue-800", ready:"bg-green-100 text-green-800", served:"bg-gray-200 text-gray-800" }

export default function AdminOrdersPage() {
  const router = useRouter()
  const language = useAdminLanguage()
  const L = getAdminOrdersTexts(language === 'ar' ? 'ar' : 'fr')
  const [orders,setOrders] = useState<Order[]>([])
  const [loading,setLoading] = useState(false)
  const [statusFilter,setStatusFilter] = useState<string>("")
  const [actionLoading,setActionLoading] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const action = useAdminActionOverlay(language)
  const systemActive = useSystemActive(true)
  
  const stream = useOrdersStream({ 
    status: statusFilter || undefined
  })

  // Initial + manual fetch (fallback before SSE populates or on refresh / filter change)
  const fetchOrders = useCallback(async () => {
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
    } catch (e) {
      console.error('[ORDERS][FETCH] error', e)
      setError(language==='ar' ? 'فشل تحميل الطلبات' : 'Échec du chargement des commandes')
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
      action.start('تحديث الطلب...', 'Mise à jour...')
      const res = await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status:newStatus }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setOrders(prev => prev
        .map(o => o && o.id === id ? { ...o, status:newStatus, updated_at: json.data.updated_at } : o)
        .filter(o => o && !(o.id === id && newStatus === 'served'))
      )
      action.success(language==='ar'? 'تم التحديث' : 'Mis à jour', language==='ar'? 'تم التحديث' : 'Mis à jour')
    } catch (err) {
      console.error('Transition error:', err)
      setError(language==='ar' ? 'فشل تحديث حالة الطلب' : 'Échec de mise à jour du statut')
      action.error(language==='ar'? 'فشل العملية' : "Échec", language==='ar'? 'فشل العملية' : "Échec")
    } finally { 
      setActionLoading(false) 
    }
  }

  const removeOrder = async (id:number) => {
    if (!id || !confirm(L.confirmDelete)) return
    
    try {
      if (!systemActive) { handleSystemInactive(language); return }
      setActionLoading(true)
      action.start('أرشفة الطلب...', 'Archivage...')
      console.log(`[ADMIN] Deleting order ${id}`)
      const res = await fetch(`/api/orders/${id}`, { method:"DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      
      console.log(`[ADMIN] Order ${id} deleted successfully`)
      setOrders(prev => prev.filter(o => o && o.id !== id))
      
      console.log('Admin: Order deleted successfully', id)
      action.success(language==='ar'? 'تمت الأرشفة' : 'Archivé', language==='ar'? 'تمت الأرشفة' : 'Archivé')
      
    } catch (err) {
      console.error('Delete error:', err)
      setError(language==='ar' ? 'فشل حذف الطلب' : 'Échec de suppression de la commande')
      console.log('Admin: Order delete failed', id)
      action.error(language==='ar'? 'فشل الأرشفة' : "Échec de l'archivage", language==='ar'? 'فشل الأرشفة' : "Échec de l'archivage")
    } finally { 
      setActionLoading(false) 
    }
  }

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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 mb-1">{L.manageOrders}</h1>
                <p className="text-sm text-slate-500">{L.filterByStatus}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOrders} 
                  disabled={loading}
                  className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                  {L.refresh}
                </Button>
              </div>
            </div>
            
            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {["","pending","approved","ready","served"].map(s => (
                <Button 
                  key={s||"all"} 
                  size="sm" 
                  variant={s===statusFilter? "default":"outline"} 
                  onClick={()=>setStatusFilter(s)}
                  className={s===statusFilter 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md" 
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }
                >
                  {s? L.status[s as keyof typeof L.status] : L.all}
                </Button>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {orders.filter(o => o && typeof o.id === 'number').map(o => (
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
              />
            ))}
            
            {/* Empty State */}
            {!loading && orders.length===0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-slate-400 mb-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-3">
                    📝
                  </div>
                </div>
                <p className="text-slate-500 font-medium">{L.noOrders}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {language === 'ar' ? 'لا توجد طلبات متاحة حاليا' : 'Aucune commande disponible actuellement'}
                </p>
              </div>
            )}
            
            {/* Loading State */}
            {loading && orders.length===0 && (
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
interface AdminOrderCardProps {
  order: Order
  items: OrderItem[]
  language: "ar" | "fr"
  onTransition: (id: number, status: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
  onLoadDetails: () => void
  actionLoading: boolean
  L: ReturnType<typeof getAdminOrdersTexts>
}

function AdminOrderCard({ order, items, language, onTransition, onRemove, onLoadDetails, actionLoading, L }: AdminOrderCardProps) {
  const [loadedDetails, setLoadedDetails] = useState(false)
  
  useEffect(() => {
    if (!loadedDetails && !items.length) {
      onLoadDetails()
      setLoadedDetails(true)
    }
  }, [loadedDetails, items.length, onLoadDetails])

  const getNextStatuses = (status: string) => STATUS_FLOW[status] || []

  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Order Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900 text-lg">#{order.daily_number ?? order.id}</span>
            <Badge variant="secondary" className="text-sm font-medium">
              {L.table} #{order.table_id}
            </Badge>
            <div>
              <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
            </div>
          </div>
          <Badge className={`${STATUS_COLOR[order.status]} border shadow-sm font-medium`}>
            {L.status[order.status as keyof typeof L.status] || order.status}
          </Badge>
        </div>

        {/* Order Items - Always visible */}
        <div className="mb-4">
          <h4 className="font-semibold text-slate-700 mb-3">{language === 'ar' ? 'عناصر الطلب' : 'Articles de la commande'}</h4>
          <div className="space-y-2">
            {(!items || !items.length) && (
              <div className="text-xs text-slate-400 italic">{language === 'ar' ? 'جاري تحميل التفاصيل...' : 'Chargement des détails...'}</div>
            )}
            {items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-800 font-medium">{item.product_name || `${language === 'ar' ? 'منتج #' : 'Produit #'}${item.product_id}`}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-slate-200 text-slate-800">
                    x{item.quantity}
                  </Badge>
                  <span className="text-sm font-medium">{item.price * item.quantity} DZD</span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Note */}
          {order.note && (
            <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-1">
                {L.customerNote}
              </p>
              <p className="text-amber-700 text-sm">{order.note}</p>
            </div>
          )}

          {/* Total */}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-slate-600 font-medium">
              {L.total}:
            </span>
            <span className="text-xl font-bold text-slate-800">
              {order.total} DZD
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Status transition buttons */}
          {getNextStatuses(order.status).map(ns => (
            <Button 
              key={ns} 
              size="sm"
              disabled={actionLoading}
              onClick={() => onTransition(order.id, ns)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : L.status[ns as keyof typeof L.status]}
            </Button>
          ))}
          
          {/* Delete Button for Pending Orders */}
          {order.status === "pending" && (
            <Button 
              size="sm" 
              variant="outline"
              disabled={actionLoading} 
              onClick={() => onRemove(order.id)}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Trash2 className="h-4 w-4 mr-1"/>{L.delete}</>}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
