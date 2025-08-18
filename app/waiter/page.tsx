"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"
import { OrdersQuickActions } from '@/components/orders-quick-actions'
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { getWaiterTexts } from "@/lib/i18n/waiter"
import { useSession } from "@/hooks/use-session"

// Supabase version replaced by Firestore REST + SSE.

type OrderStatus = "pending" | "approved" | "ready" | "served"

interface OrderItem { id:number; order_id:number; product_id:number; product_name?:string; quantity:number; price:number }
interface Order { id:number; table_id:number; status:OrderStatus; total:number; created_at:string; updated_at:string; last_status_at?:string; note?:string; items?:OrderItem[]; daily_number?:number }

export default function WaiterPage() {
  const language = useAdminLanguage()
  const { user, loading: sessionLoading } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const loadingDetailsRef = useRef<Set<number>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const evtRef = useRef<EventSource | null>(null)
  const t = useMemo(()=> getWaiterTexts(language), [language])

  // Initialize audio
  useEffect(() => {
    // Use provided audio or fallback silent if missing
    audioRef.current = new Audio("/notification.wav")
    audioRef.current.addEventListener('error', () => {
      // Graceful fallback (no 404 spam after first attempt)
      audioRef.current = null
    })
    audioRef.current.volume = 0.7
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      if (!user) return
      // 1. Fetch base orders filtered by status
      const res = await fetch('/api/orders?status=ready', { cache: 'no-store' })
      const json = await res.json()
      let base: Order[] = []
      if (json.success && Array.isArray(json.data)) base = json.data as Order[]
      if (!base.length) { setOrders([]); return }

      // 2. Batch fetch details (items + note)
      const ids = base.map(o=> o.id)
      try {
        const bd = await fetch('/api/orders/details-batch', { method: 'POST', body: JSON.stringify({ ids }) })
        if (bd.ok) {
          const bj = await bd.json()
          if (bj.success && bj.data?.orders) {
            const map: Record<number,{ items:OrderItem[]; note?:string }> = bj.data.orders
            base = base.map(o => map[o.id] ? { ...o, items: map[o.id].items, note: map[o.id].note } : o)
          }
        }
      } catch {/* ignore batch failure; show base only */}
      setOrders(base)
    } catch (e) {
      console.error('[WAITER] fetchOrders failed', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadDetailsForOrder = useCallback(async (orderId:number) => {
    if (loadingDetailsRef.current.has(orderId)) return
    loadingDetailsRef.current.add(orderId)
    try {
      const bd = await fetch('/api/orders/details-batch', { method:'POST', body: JSON.stringify({ ids:[orderId] }) })
      if (!bd.ok) return
      const bj = await bd.json()
      if (!bj.success || !bj.data?.orders) return
      const rec = bj.data.orders[orderId]
      if (!rec) return
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: rec.items, note: rec.note } : o))
    } catch {/* ignore */} finally {
      loadingDetailsRef.current.delete(orderId)
    }
  }, [])

  const setupStream = useCallback(() => {
    if (evtRef.current) { evtRef.current.close(); evtRef.current = null }
    const es = new EventSource('/api/stream/orders')
    evtRef.current = es
    es.addEventListener('order.created', ev => {
      try {
        const data = JSON.parse((ev as MessageEvent).data)
        // Only add if it's ready status (waiter doesn't see pending/approved)
        if (data.status === 'ready') {
          setOrders(prev => {
            if (prev.some(o=> o.id === data.id)) return prev
            const next = [...prev, data as Order].sort((a,b)=> a.id - b.id)
            if (soundEnabled && audioRef.current) audioRef.current.play().catch(()=>{})
      void loadDetailsForOrder(data.id)
      console.log('[WAITER][SSE] ready (created)', data.id)
            return next
          })
        }
      } catch {}
    })
    es.addEventListener('order.updated', ev => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Order
        if (data.status === 'ready') {
          // Order became ready - add it or update it
          setOrders(prev => {
            const existing = prev.find(o=> o.id === data.id)
            if (existing) return prev.map(o=> o.id === data.id ? { ...o, ...data } : o)
            else {
              const next = [...prev, data].sort((a,b)=> a.id - b.id)
              if (soundEnabled && audioRef.current) audioRef.current.play().catch(()=>{})
        void loadDetailsForOrder(data.id)
        console.log('[WAITER][SSE] ready (updated)', data.id)
              return next
            }
          })
        } else {
          // Order changed to non-ready status - remove it
          setOrders(prev => prev.filter(o=> o.id !== data.id))
        }
      } catch {}
    })
    es.addEventListener('order.deleted', ev => {
      try { const data = JSON.parse((ev as MessageEvent).data); setOrders(prev => prev.filter(o=> o.id !== data.id)) } catch {}
    })
    es.addEventListener('error', () => { /* silently ignore */ })
  }, [soundEnabled, loadDetailsForOrder])

  // Redirect non-waiter users
  useEffect(() => {
    if (sessionLoading || !user) return
    if (user.role !== 'waiter') {
      // Redirect based on role
      if (user.role === 'admin') window.location.href = '/admin/dashboard'
      else if (user.role === 'kitchen') window.location.href = '/kitchen'
      else window.location.href = '/auth'
    }
  }, [user, sessionLoading])

  // Setup data fetching and subscriptions
  useEffect(() => {
    if (sessionLoading) return
    fetchOrders()
    setupStream()
    return () => { if (evtRef.current) evtRef.current.close() }
  }, [fetchOrders, setupStream, sessionLoading])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchOrders()
    setIsRefreshing(false)

    console.log('Orders refreshed:', language === "ar" ? "تم التحديث" : "Actualisé")
  }

  const handleServe = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'served' }) })
      const j = await res.json()
      if (!j.success) return
      setOrders(prev => prev.filter(o=> o.id !== orderId))
      console.log('Order served:', language === 'ar' ? 'تم التقديم' : 'Servi')
    } catch (e) { console.error('[WAITER] serve failed', e) }
  }

  const handleCancel = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })
      const j = await res.json()
      if (!j.success) return
      setOrders(prev => prev.filter(o=> o.id !== orderId))
      console.log('Order cancelled:', language === 'ar' ? 'تم الإلغاء' : 'Annulé')
    } catch (e) { console.error('[WAITER] cancel failed', e) }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "ready":
        return "bg-green-500 text-white"
      case "pending":
        return "bg-blue-500 text-white"
      case "approved":
        return "bg-yellow-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "approved":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return t.justNow
    if (diffInMinutes === 1) return `${diffInMinutes} ${t.minute} ${t.ago}`
    return `${diffInMinutes} ${t.minutes} ${t.ago}`
  }

  if (loading || sessionLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === "ar" ? "rtl" : "ltr"}`}>
        <AdminHeader title={t.title} />
        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Loading Stats Header */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 bg-slate-200 rounded animate-pulse w-32"></div>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-48"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 bg-slate-200 rounded animate-pulse w-20"></div>
                  <div className="h-8 bg-slate-200 rounded animate-pulse w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading Order Cards */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-sm border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-6 bg-slate-200 rounded animate-pulse w-16"></div>
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded animate-pulse w-16"></div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div>
                    <div className="space-y-2">
                      <div className="h-12 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-12 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-16"></div>
                      <div className="h-6 bg-slate-200 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Filter orders - waiter only sees ready orders
  const activeOrders = orders.filter(o=> o.status === 'ready')

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === "ar" ? "rtl" : "ltr"}`}>
      <AdminHeader title={t.title} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Header */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                  {language === "ar" ? "طلبات جاهزة" : "Ready Orders"}
                </h2>
                <p className="text-slate-600">
                  {activeOrders.length} {language === "ar" ? "طلب جاهز للتقديم" : "orders ready to serve"}
                </p>
              </div>
              <OrdersQuickActions
                role="waiter"
                soundEnabled={soundEnabled}
                onToggleSound={()=> setSoundEnabled(s=> !s)}
                onRefresh={handleRefresh}
                onExpandAll={()=> {}} // No-op since items are always visible
                onCollapseAll={()=> {}} // No-op since items are always visible
                pendingCount={activeOrders.length}
                onBulkAction={async ()=>{
                  for (const o of activeOrders) { await handleServe(o.id) }
                }}
                bulkActionLabel={t.serve}
                loading={isRefreshing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {activeOrders.length === 0 ? (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-800">{t.noOrders}</h3>
              <p className="text-slate-500">
                {language === "ar" ? "جميع الطلبات تم تقديمها أو لا توجد طلبات جاهزة" : "All orders served or no orders ready"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <WaiterOrderCard
                key={order.id}
                order={order}
                language={language}
                onServe={handleServe}
                onCancel={handleCancel}
                formatTimeAgo={formatTimeAgo}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                t={t}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// Order card component for cleaner code
interface WaiterOrderCardProps {
  order: Order
  language: "ar" | "fr"
  onServe: (orderId: number) => void
  onCancel: (orderId: number) => void
  formatTimeAgo: (dateString: string) => string
  getStatusColor: (status: OrderStatus) => string
  getStatusIcon: (status: OrderStatus) => React.ReactNode
  t: Record<string, string>
  forceExpand?: boolean
}

function WaiterOrderCard({ order, language, onServe, onCancel, formatTimeAgo, getStatusColor, getStatusIcon, t }: WaiterOrderCardProps) {
  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Order Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm font-medium">
              {t.table} #{order.table_id}
            </Badge>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">#{order.daily_number ?? order.id}</span>
            <div>
              <p className="text-sm text-slate-500">{formatTimeAgo(order.updated_at)}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(order.status)} flex items-center gap-2 px-3 py-1 text-sm font-medium`}>
            {getStatusIcon(order.status)}
            {t[order.status]}
          </Badge>
        </div>

        {/* Order Items - Always visible */}
        <div className="mb-4">
          <h4 className="font-semibold text-slate-700 mb-3">{t.items}</h4>
          <div className="space-y-2">
            {(!order.items || !order.items.length) && (
              <div className="text-xs text-slate-400 italic">{language==='ar'? 'جاري تحميل التفاصيل...' : 'Loading details...'}</div>
            )}
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-800 font-medium">{item.product_name || `Product ${item.product_id}`}</span>
                <Badge variant="secondary" className="bg-slate-200 text-slate-800">
                  x{item.quantity}
                </Badge>
              </div>
            ))}
          </div>

          {/* Order Note */}
          {order.note && (
            <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-1">
                {language === 'ar' ? 'ملاحظة' : 'Note'}
              </p>
              <p className="text-amber-700 text-sm">{order.note}</p>
            </div>
          )}

          {/* Total */}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-slate-600 font-medium">
              {language === 'ar' ? 'المجموع' : 'Total'}:
            </span>
            <span className="text-xl font-bold text-slate-800">
              {order.total} {language === 'ar' ? 'دج' : 'DZD'}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => onCancel(order.id)}
            variant="outline"
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={() => onServe(order.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t.serve}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
