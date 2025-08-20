"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { KitchenOrder, OrderStatus } from './order-card'

interface ApiOrder { id:number; table_id:number; status:OrderStatus; updated_at:string; total:number; note?:string; daily_number?:number }
interface ApiOrderItem { id:number; order_id:number; product_id:number; quantity:number; product_name?:string }

// augment KitchenOrder with items field locally
// (order-card defines base shape including status union)
interface KitchenOrderWithItems extends KitchenOrder { items?:ApiOrderItem[] }

interface UseKitchenOrdersOptions { language:'ar'|'fr'; t:Record<string,string>; soundEnabled:boolean }

export function useKitchenOrders({ language, t, soundEnabled }:UseKitchenOrdersOptions){
  const [orders,setOrders] = useState<KitchenOrderWithItems[]>([])
  const [loading,setLoading] = useState(true)
  const loadingDetailsRef = useRef<Set<number>>(new Set())

  const fetchOrders = useCallback(async()=>{
    try {
      const res = await fetch('/api/orders?status=approved',{ cache:'no-store' })
      if(!res.ok) throw new Error('failed')
  const data:ApiOrder[] = await res.json()
  setOrders(data as KitchenOrderWithItems[])
    } catch (e){
      console.error(e)
    } finally { setLoading(false) }
  },[])

  const fetchDetailsBatch = useCallback(async(ids:number[])=>{
    if(!ids.length) return
    try {
      const res = await fetch('/api/orders/details-batch',{ method:'POST', body: JSON.stringify({ ids }) })
      if(!res.ok) return
      const items:ApiOrderItem[] = await res.json()
  setOrders(prev => prev.map(o => ({...o, items: items.filter(i=>i.order_id===o.id)})))
    } catch(e){ console.error(e) }
  },[])

  const ensureDetails = useCallback((id:number)=>{
    if(loadingDetailsRef.current.has(id)) return
    loadingDetailsRef.current.add(id)
    fetchDetailsBatch([id])
  },[fetchDetailsBatch])

  // actions
  const markReady = useCallback(async(id:number)=>{
    const prev = orders
    setOrders(o=>o.map(ord=> ord.id===id? {...ord, status:'ready'}:ord))
    try {
      const res = await fetch(`/api/orders/${id}/ready`,{ method:'POST' })
      if(!res.ok) throw new Error('fail')
      if(soundEnabled){
        const audio = new Audio('/notification.wav'); audio.play().catch(()=>{})
      }
      toast.success(t.markedReadySuccess)
      return true
    } catch(e){
      setOrders(prev)
      toast.error(t.markedReadyFail)
      return false
    }
  },[orders,soundEnabled,t])

  const cancel = useCallback(async(id:number)=>{
    const prev = orders
    setOrders(o=>o.filter(ord=>ord.id!==id))
    try {
      const res = await fetch(`/api/orders/${id}/cancel`,{ method:'POST' })
      if(!res.ok) throw new Error('fail')
      toast.success(t.cancelledSuccess)
      return true
    } catch(e){
      setOrders(prev)
      toast.error(t.cancelledFail)
      return false
    }
  },[orders,t])

  const bulkReady = useCallback(async()=>{
    const ids = orders.filter(o=>o.status==='approved').map(o=>o.id)
    if(!ids.length) return
    const prev = orders
    setOrders(o=>o.map(ord=> ids.includes(ord.id)? {...ord, status:'ready'}:ord))
    try {
      const res = await fetch('/api/orders/bulk-ready',{ method:'POST', body: JSON.stringify({ ids }) })
      if(!res.ok) throw new Error('fail')
      toast.success(language==='ar'? 'تم تجهيز الطلبات':'Orders marked ready')
    } catch(e){
      setOrders(prev)
      toast.error(language==='ar'? 'فشل الإجراء':'Action failed')
    }
  },[orders,language])

  // SSE stream
  useEffect(()=>{
    fetchOrders()
  },[fetchOrders])

  useEffect(()=>{
    const es = new EventSource('/api/orders/stream?role=kitchen')
    es.onmessage = (ev)=>{
      try {
        const parsed = JSON.parse(ev.data)
        if(parsed.type==='created' && parsed.order.status==='approved'){
          setOrders(prev=>[parsed.order,...prev])
        } else if(parsed.type==='updated'){
          setOrders(prev=> prev.map(o=> o.id===parsed.order.id? {...o,...parsed.order}:o))
        } else if(parsed.type==='deleted'){
          setOrders(prev=> prev.filter(o=>o.id!==parsed.id))
        }
      } catch(e){ console.error(e) }
    }
    return ()=>{ es.close() }
  },[])

  const stats = useMemo(()=>{
    const approved = orders.filter(o=>o.status==='approved').length
    const ready = orders.filter(o=>o.status==='ready').length
    return { approved, ready, total: orders.length }
  },[orders])

  return { orders: orders as KitchenOrder[], loading, stats, markReady, cancel, bulkReady, ensureDetails }
}
