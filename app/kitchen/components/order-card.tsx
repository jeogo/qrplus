"use client"
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChefHat, CheckCircle, Clock } from 'lucide-react'
import React from 'react'

// Keep a strict union but export it for reuse
export type OrderStatus = 'pending' | 'approved' | 'ready' | 'served'
interface OrderItem { id:number; product_id:number; product_name?:string; quantity:number }
export interface KitchenOrder { id:number; table_id:number; status:OrderStatus; updated_at:string; total:number; note?:string; items?:OrderItem[]; daily_number?:number }

interface Props {
  order: KitchenOrder
  language: 'ar' | 'fr' | 'en'
  formatTimeAgo: (iso:string)=>string
  t: Record<string,string>
  onMarkReady: (id:number)=>void
  onCancel: (id:number)=>void
}

export function KitchenOrderCard({ order, language, formatTimeAgo, t, onMarkReady, onCancel }: Props){
  const statusClass = {
    approved: 'bg-yellow-500 text-white',
    ready: 'bg-green-500 text-white',
    pending: 'bg-blue-500 text-white',
    served: 'bg-gray-500 text-white'
  }[order.status]
  const statusIcon = () => {
    switch(order.status){
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'ready': return <ChefHat className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
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
          <Badge className={`flex items-center gap-2 px-3 py-1 text-sm font-medium ${statusClass}`}>{statusIcon()}{t[order.status]}</Badge>
        </div>
        <div className="mb-4">
          <h4 className="font-semibold text-slate-700 mb-3">{t.items}</h4>
          <div className="space-y-2">
            {(!order.items || !order.items.length) && <div className="text-xs text-slate-400 italic">{t.loadingDetails || (language==='ar'? 'جاري تحميل التفاصيل...' : language==='fr'? 'Chargement des détails...' : 'Loading details...')}</div>}
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
          <Button onClick={()=>onMarkReady(order.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white"><ChefHat className="h-4 w-4 mr-2" />{t.markReady}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
