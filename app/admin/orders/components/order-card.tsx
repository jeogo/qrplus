"use client"
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { getAdminOrdersTexts } from '@/lib/i18n/admin-orders'

interface Order { id:number; table_id:number; status:string; total:number; created_at:string; updated_at:string; note?:string; daily_number?:number }
interface OrderItem { id:number; product_id:number; product_name?:string; quantity:number; price:number }

const STATUS_COLOR: Record<string,string> = { pending:"bg-yellow-100 text-yellow-800", approved:"bg-blue-100 text-blue-800", ready:"bg-green-100 text-green-800", served:"bg-gray-200 text-gray-800" }
const STATUS_FLOW: Record<string,string[]> = { pending:['approved'], approved:['ready'], ready:['served'], served:[] }

export interface AdminOrderCardProps {
  order: Order
  items: OrderItem[]
  // language prop removed (not used)
  onTransition: (id:number, status:string)=> Promise<void>
  onRemove: (id:number)=> Promise<void>
  onLoadDetails: ()=> void
  actionLoading: boolean
  L: ReturnType<typeof getAdminOrdersTexts>
  mode?: 'cards' | 'list' | 'compact'
}

export function AdminOrderCard({ order, items, onTransition, onRemove, onLoadDetails, actionLoading, L, mode='cards' }: AdminOrderCardProps){
  const [loadedDetails, setLoadedDetails] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(()=> { setMounted(true) },[])
  useEffect(()=> {
    if(!loadedDetails && !items.length){ onLoadDetails(); setLoadedDetails(true) }
  }, [loadedDetails, items.length, onLoadDetails])

  const baseCard = mode === 'cards'
  const compact = mode === 'compact'
  const nextStatuses = STATUS_FLOW[order.status] || []

  return (
    <Card className={
      (baseCard? 'shadow-sm border-slate-200 hover:shadow-md bg-white/60 backdrop-blur-sm ':'shadow-xs border-slate-200 hover:border-slate-300 ') +
      'transition-all duration-300 rounded-xl relative ' +
      (mounted? 'animate-in fade-in slide-in-from-bottom-2':'opacity-0')
    }>
      <CardContent className={baseCard? 'p-5':'p-3'}>
        <div className={"flex items-start justify-between mb-4 gap-3 " + (compact? 'mb-3':'')}>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900 text-lg">#{order.daily_number ?? order.id}</span>
            <Badge variant="secondary" className="text-sm font-medium">{L.table} #{order.table_id}</Badge>
            <div><p className="text-xs sm:text-sm text-slate-500">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p></div>
          </div>
            <Badge className={`${STATUS_COLOR[order.status]} border shadow-sm font-medium`}>{L.status[order.status as keyof typeof L.status] || order.status}</Badge>
        </div>
        {baseCard && (
          <div className="mb-4">
            <h4 className="font-semibold text-slate-700 mb-3">{L.itemsLabel || 'Items'}</h4>
            <div className="space-y-2">
              {(!items || !items.length) && (<div className="text-xs text-slate-400 italic">{L.loading}</div>)}
              {items?.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-800 font-medium">{item.product_name || `#${item.product_id}`}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-200 text-slate-800">x{item.quantity}</Badge>
                    <span className="text-sm font-medium">{item.price * item.quantity} DZD</span>
                  </div>
                </div>
              ))}
            </div>
            {order.note && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-1">{L.customerNote}</p>
                <p className="text-amber-700 text-sm">{order.note}</p>
              </div>
            )}
            <div className="mt-4 flex justify-between items-center">
              <span className="text-slate-600 font-medium">{L.total}:</span>
              <span className="text-xl font-bold text-slate-800">{order.total} DZD</span>
            </div>
          </div>
        )}
        {!baseCard && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><span className="font-medium">{L.total}:</span><span className="font-semibold text-slate-800">{order.total} DZD</span></div>
            {order.note && (<span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs max-w-xs truncate">{order.note}</span>)}
            <span className="text-xs text-slate-400">{items.length} {L.itemsLabel || 'items'}</span>
          </div>
        )}
        <div className="flex gap-2 flex-wrap mt-4">
          {nextStatuses.map(ns => (
            <Button key={ns} size="sm" disabled={actionLoading} onClick={()=> onTransition(order.id, ns)} className={baseCard? 'flex-1 bg-blue-600 hover:bg-blue-700 text-white':'bg-blue-600 hover:bg-blue-700 text-white'}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : L.status[ns as keyof typeof L.status]}
            </Button>
          ))}
          {order.status === 'pending' && (
            <Button size="sm" variant="outline" disabled={actionLoading} onClick={()=> onRemove(order.id)} className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Trash2 className="h-4 w-4 mr-1"/>{L.delete}</>}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
