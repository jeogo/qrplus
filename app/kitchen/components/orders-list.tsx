"use client"
import React from 'react'
import { KitchenOrderCard, KitchenOrder } from './order-card'

interface Props {
  orders: KitchenOrder[]
  language: 'ar' | 'fr'
  t: Record<string,string>
  formatTimeAgo: (iso:string)=>string
  onMarkReady: (id:number)=>void
  onCancel: (id:number)=>void
}

export function KitchenOrdersList({ orders, language, t, formatTimeAgo, onMarkReady, onCancel }: Props){
  if(!orders.length){
    return <div className="text-center py-20 text-slate-400 text-sm">{language==='ar'? 'لا توجد طلبات حالياً':'No orders right now'}</div>
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {orders.map(o => (
        <KitchenOrderCard key={o.id} order={o} language={language} t={t} formatTimeAgo={formatTimeAgo} onMarkReady={onMarkReady} onCancel={onCancel} />
      ))}
    </div>
  )
}
