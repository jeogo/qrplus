"use client"
import { useState, useCallback, useRef, useEffect } from 'react'

type OrderStatus = 'pending' | 'approved' | 'ready' | 'served'
interface OrderItem { id:number; order_id:number; product_id:number; product_name?:string; quantity:number; price:number }
export interface Order { id:number; table_id:number; status:OrderStatus; total:number; created_at:string; updated_at:string; note?:string; items?:OrderItem[]; daily_number?:number }

export function useWaiterOrders(user: { role?: string } | null, soundEnabled: boolean){
  const [orders,setOrders] = useState<Order[]>([])
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const detailsRef = useRef<Set<number>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const evtRef = useRef<EventSource | null>(null)

  useEffect(()=>{
    audioRef.current = new Audio('/notification.wav')
    audioRef.current.volume = 0.7
    audioRef.current.addEventListener('error', ()=> { audioRef.current = null })
  },[])

  const loadDetails = useCallback(async (id:number)=>{
    if (detailsRef.current.has(id)) return
    detailsRef.current.add(id)
    try {
      const res = await fetch('/api/orders/details-batch', { method:'POST', body: JSON.stringify({ ids:[id] }) })
      if (!res.ok) return
      const json = await res.json()
      const rec = json.data?.orders?.[id]
      if (rec) setOrders(prev => prev.map(o=> o.id===id? { ...o, items: rec.items, note: rec.note }: o))
    } finally { detailsRef.current.delete(id) }
  },[])

  const fetchOrders = useCallback(async ()=>{
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders?status=ready', { cache:'no-store' })
      const json = await res.json()
      let base: Order[] = []
      if (json.success && Array.isArray(json.data)) base = json.data
      if (!base.length) { setOrders([]); return }
      const ids = base.map(o=> o.id)
      try {
        const bd = await fetch('/api/orders/details-batch', { method:'POST', body: JSON.stringify({ ids }) })
        if (bd.ok){
          const bj = await bd.json()
          if (bj.success && bj.data?.orders){
            const map: Record<number,{ items:OrderItem[]; note?:string }> = bj.data.orders
            base = base.map(o=> map[o.id]? { ...o, items: map[o.id].items, note: map[o.id].note }: o)
          }
        }
      } catch {}
      setOrders(base)
    } finally { setLoading(false) }
  },[user])

  const refresh = useCallback(async ()=>{
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  },[fetchOrders])

  // SSE
  useEffect(()=>{
    if (!user) return
    if (evtRef.current) evtRef.current.close()
    const es = new EventSource('/api/stream/orders')
    evtRef.current = es
    es.addEventListener('order.created', ev => {
      try {
        const data = JSON.parse((ev as MessageEvent).data)
        if (data.status==='ready') {
          setOrders(prev => {
            if (prev.some(o=>o.id===data.id)) return prev
            const next = [...prev, data].sort((a,b)=> a.id-b.id)
            if (soundEnabled && audioRef.current) audioRef.current.play().catch(()=>{})
            void loadDetails(data.id)
            return next
          })
        }
      } catch {}
    })
    es.addEventListener('order.updated', ev => {
      try {
        const data = JSON.parse((ev as MessageEvent).data)
        if (data.status==='ready') {
          setOrders(prev => {
            const ex = prev.find(o=>o.id===data.id)
            if (ex) return prev.map(o=> o.id===data.id? { ...o, ...data }: o)
            const next = [...prev, data].sort((a,b)=> a.id-b.id)
            if (soundEnabled && audioRef.current) audioRef.current.play().catch(()=>{})
            void loadDetails(data.id)
            return next
          })
        } else {
          setOrders(prev => prev.filter(o=> o.id!==data.id))
        }
      } catch {}
    })
    es.addEventListener('order.deleted', ev => { try { const d = JSON.parse((ev as MessageEvent).data); setOrders(prev => prev.filter(o=> o.id!==d.id)) } catch {} })
    return () => { es.close() }
  },[user, soundEnabled, loadDetails])

  useEffect(()=>{ if (user) fetchOrders() },[user, fetchOrders])

  const serve = useCallback(async (id:number)=>{
    try {
      const res = await fetch(`/api/orders/${id}`, { method:'PATCH', body: JSON.stringify({ status:'served' }) })
      const j = await res.json()
      if (j.success) { setOrders(prev => prev.filter(o=>o.id!==id)); return true }
      return false
    } catch { return false }
  },[])
  const cancel = useCallback(async (id:number)=>{
    try {
      const res = await fetch(`/api/orders/${id}`, { method:'PATCH', body: JSON.stringify({ status:'cancelled' }) })
      const j = await res.json()
      if (j.success) { setOrders(prev => prev.filter(o=>o.id!==id)); return true }
      return false
    } catch { return false }
  },[])

  return { orders, loading, refreshing, refresh, serve, cancel }
}
