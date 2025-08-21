"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notify } from '@/lib/notifications/facade'
import type { KitchenOrder, OrderStatus } from './order-card'

interface ApiOrder { id:number; table_id:number; status:OrderStatus; updated_at:string; total:number; note?:string; daily_number?:number }
interface ApiOrderItem { id:number; order_id:number; product_id:number; quantity:number; product_name?:string }

// augment KitchenOrder with items field locally
// (order-card defines base shape including status union)
interface KitchenOrderWithItems extends KitchenOrder { items?:ApiOrderItem[] }

interface UseKitchenOrdersOptions { t:Record<string,string>; soundEnabled:boolean }

// t and soundEnabled kept for future i18n & audio feedback expansion
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useKitchenOrders({ t: _t, soundEnabled: _soundEnabled }:UseKitchenOrdersOptions){
  const [orders,setOrders] = useState<KitchenOrderWithItems[]>([])
  // loading covers BOTH base orders + their items ("load all then show")
  const [loading,setLoading] = useState(true)
  const loadingDetailsRef = useRef<Set<number>>(new Set()) // kept for any on‑demand future fetches

  const loadDetailsBatch = useCallback(async(ids:number[])=>{
    if(!ids.length) return
    try {
      const res = await fetch('/api/orders/details-batch',{ method:'POST', body: JSON.stringify({ ids }) })
      if(!res.ok) return
  const json: { success?: boolean; data?: { orders?: Record<number,{ items:ApiOrderItem[]; note?:string }> } } | null = await res.json().catch(()=>null)
      if(json?.success && json.data?.orders){
        const map: Record<number,{ items:ApiOrderItem[]; note?:string }> = json.data.orders
        setOrders(prev => prev.map(o => map[o.id] ? { ...o, items: map[o.id].items, note: map[o.id].note } : o))
      }
    } catch { /* ignore */ }
  },[])

  const fetchOrders = useCallback(async()=>{
    setLoading(true)
    try {
      const res = await fetch('/api/orders?status=approved',{ cache:'no-store' })
      if(!res.ok) throw new Error('failed')
      const raw = await res.json().catch(()=>({}))
      const data:ApiOrder[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
      const base = Array.isArray(data) ? (data as KitchenOrderWithItems[]) : []
      setOrders(base)
      // batch fetch ALL item details before releasing loading state
      const ids = base.map(o=>o.id)
      if(ids.length) await loadDetailsBatch(ids)
    } catch {
      setOrders([])
    } finally { setLoading(false) }
  },[loadDetailsBatch])

  const ensureDetails = useCallback((id:number)=>{ // fallback on-demand
    if(loadingDetailsRef.current.has(id)) return
    loadingDetailsRef.current.add(id)
    void loadDetailsBatch([id])
  },[loadDetailsBatch])

  // actions
  const markReady = useCallback(async(id:number)=>{
    const prev = orders
    setOrders(o=>o.map(ord=> ord.id===id? {...ord, status:'ready'}:ord))
    try {
      const res = await fetch(`/api/orders/${id}/ready`,{ method:'POST' })
      if(!res.ok) throw new Error('fail')
      notify({ type:'kitchen.order.markReady.success' })
      return true
	} catch {
      setOrders(prev)
      notify({ type:'kitchen.order.markReady.error' })
      return false
    }
  },[orders]) // soundEnabled & t excluded: do not alter logic; notify keys static

  const cancel = useCallback(async(id:number)=>{
    const prev = orders
    setOrders(o=>o.filter(ord=>ord.id!==id))
    try {
      const res = await fetch(`/api/orders/${id}`,{ method:'PATCH', body: JSON.stringify({ status:'cancelled' }) })
      if(!res.ok) throw new Error('fail')
      notify({ type:'kitchen.order.cancel.success' })
      return true
    } catch {
      setOrders(prev)
      notify({ type:'kitchen.order.cancel.error' })
      return false
    }
  },[orders]) // t excluded: notify keys static

  // bulkReady removed per request

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
          const withItems = parsed.items ? { ...parsed.order, items: parsed.items } : parsed.order
          setOrders(prev=>[withItems,...prev])
          if(!withItems.items) void ensureDetails(withItems.id) // safeguard
        } else if(parsed.type==='updated'){
          setOrders(prev=> prev.map(o=> o.id===parsed.order.id? { ...o, ...parsed.order }:o))
          if(parsed.order.status==='approved'){
            // if it just became approved and lacks items, fetch them
            setTimeout(()=>{ const current = orders.find(o=>o.id===parsed.order.id); if(current && (!current.items || !current.items.length)) void ensureDetails(parsed.order.id) },0)
          }
        } else if(parsed.type==='deleted'){
          setOrders(prev=> prev.filter(o=>o.id!==parsed.id))
        }
      } catch { /* ignore parse */ }
    }
    return ()=>{ es.close() }
  },[ensureDetails, orders])

  const stats = useMemo(()=>{
    if(!Array.isArray(orders)) return { approved:0, ready:0, total:0 }
    const approved = orders.filter(o=>o.status==='approved').length
    const ready = orders.filter(o=>o.status==='ready').length
    return { approved, ready, total: orders.length }
  },[orders])

  return { orders: orders as KitchenOrder[], loading, stats, markReady, cancel, ensureDetails }
}
