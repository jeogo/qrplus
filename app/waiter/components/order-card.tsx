"use client"
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import React from 'react'

type OrderStatus = 'pending' | 'approved' | 'ready' | 'served'
interface OrderItem { id:number; product_id:number; product_name?:string; quantity:number }
export interface OrderCardOrder { id:number; table_id:number; status:OrderStatus; updated_at:string; total:number; note?:string; items?:OrderItem[]; daily_number?:number }

export interface WaiterOrderCardProps {
  order: OrderCardOrder
  language: 'ar' | 'fr' | 'en'
  onServe: (id:number)=>void
  onCancel: (id:number)=>void
  formatTimeAgo: (iso:string)=>string
  t: Record<string,string>
  variant?: 'card' | 'row'
}

export function WaiterOrderCard({ order, language, onServe, onCancel, formatTimeAgo, t, variant='card' }: WaiterOrderCardProps){
  const getStatusIcon = (status: OrderStatus) => {
    switch(status){
      case 'ready': return <CheckCircle className="h-4 w-4" />
      case 'approved': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }
  const statusClass = {
    ready: 'bg-green-500 text-white',
    approved: 'bg-yellow-500 text-white',
    pending: 'bg-blue-500 text-white',
    served: 'bg-gray-500 text-white'
  }[order.status]

  if (variant==='row') {
    return (
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition group animate-in fade-in">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs font-medium">{t.table} #{order.table_id}</Badge>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">#{order.daily_number ?? order.id}</span>
          </div>
          <p className="text-xs text-slate-500 leading-none">{formatTimeAgo(order.updated_at)}</p>
          {order.note && <p className="text-[11px] mt-1 text-amber-600 truncate max-w-xs">{order.note}</p>}
        </div>
        <Badge className={`px-2 py-1 text-[11px] font-medium flex items-center gap-1 ${statusClass}`}>{getStatusIcon(order.status)}{t[order.status]}</Badge>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">{order.total} {language==='ar'? 'دج':'DZD'}</p>
          <p className="text-[11px] text-slate-500">{order.items?.length||0} {t.items}</p>
        </div>
        <div className="flex gap-1">
          <Button onClick={()=>onCancel(order.id)} variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 h-8 px-2">{t.cancel || (language==='ar'? 'إلغاء': language==='fr'? 'Annuler':'Cancel')}</Button>
          <Button onClick={()=>onServe(order.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"><CheckCircle className="h-3.5 w-3.5 mr-1" />{t.serve}</Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow animate-in fade-in">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm font-medium">{t.table} #{order.table_id}</Badge>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">#{order.daily_number ?? order.id}</span>
            <p className="text-sm text-slate-500">{formatTimeAgo(order.updated_at)}</p>
          </div>
          <Badge className={`flex items-center gap-2 px-3 py-1 text-sm font-medium ${statusClass}`}>{getStatusIcon(order.status)}{t[order.status]}</Badge>
        </div>
        <div className="mb-4">
          <h4 className="font-semibold text-slate-700 mb-3">{t.items}</h4>
          <div className="space-y-2">
            {(!order.items || !order.items.length) && (
              <div className="text-xs text-slate-400 italic">{t.loadingDetails || (language==='ar'? 'جاري تحميل التفاصيل...' : language==='fr'? 'Chargement des détails...' : 'Loading details...')}</div>
            )}
            {order.items?.map(it => (
              <div key={it.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-800 font-medium truncate max-w-[70%]">{it.product_name || `Product ${it.product_id}`}</span>
                <Badge variant="secondary" className="bg-slate-200 text-slate-800">x{it.quantity}</Badge>
              </div>
            ))}
          </div>
          {order.note && (
            <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-1">{t.note || (language==='ar'? 'ملاحظة': language==='fr'? 'Note':'Note')}</p>
              <p className="text-amber-700 text-sm whitespace-pre-wrap">{order.note}</p>
            </div>
          )}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-slate-600 font-medium">{t.total || (language==='ar'? 'المجموع': language==='fr'? 'Total':'Total')}:</span>
            <span className="text-xl font-bold text-slate-800">{order.total} {language==='ar'? 'دج':'DZD'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={()=>onCancel(order.id)} variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300">{t.cancel || (language==='ar'? 'إلغاء': language==='fr'? 'Annuler':'Cancel')}</Button>
          <Button onClick={()=>onServe(order.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="h-4 w-4 mr-2" />{t.serve}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
