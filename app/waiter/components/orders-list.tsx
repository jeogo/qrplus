"use client"
import { WaiterOrderCard, type OrderCardOrder } from './order-card'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

interface Props {
  orders: OrderCardOrder[]
  language: 'ar' | 'fr' | 'en'
  viewMode: 'cards' | 'list'
  t: Record<string,string>
  formatTimeAgo: (iso:string)=>string
  onServe: (id:number)=>void
  onCancel: (id:number)=>void
}

export function OrdersList({ orders, language, viewMode, t, formatTimeAgo, onServe, onCancel }: Props){
  if (!orders.length) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-slate-800">{t.noOrders}</h3>
          <p className="text-slate-500">{t.noOrdersDesc}</p>
        </CardContent>
      </Card>
    )
  }
  if (viewMode==='list') {
    return (
      <div className="space-y-2">
        {orders.map(o=> (
          <WaiterOrderCard key={o.id} order={o} language={language} onServe={onServe} onCancel={onCancel} formatTimeAgo={formatTimeAgo} t={t} variant="row" />
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {orders.map(o=> (
        <WaiterOrderCard key={o.id} order={o} language={language} onServe={onServe} onCancel={onCancel} formatTimeAgo={formatTimeAgo} t={t} />
      ))}
    </div>
  )
}
