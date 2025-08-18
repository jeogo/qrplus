"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
  
export interface LiveOrder {
  id:number; table_id:number; status:string; total:number; created_at:string; updated_at:string; last_status_at?: string; daily_number?: number
}

type EventType = 'order.created'|'order.updated'|'order.deleted'

export interface UseOrdersStreamOptions { 
  status?: string 
  enableNotifications?: boolean
  sessionReady?: boolean
  leaderCoordination?: boolean
  onStateChange?: (state:'connecting'|'open'|'closed') => void
  onEvent?: (type:EventType, payload:unknown) => void
  onLeader?: (leader:boolean) => void
}

// ---------------- Singleton (shared) connection registry ----------------
interface SharedConnListener {
  setOrders: React.Dispatch<React.SetStateAction<Record<number,LiveOrder>>>;
  setIds: React.Dispatch<React.SetStateAction<number[]>>;
  setConnected: React.Dispatch<React.SetStateAction<'connecting'|'open'|'closed'>>;
  onEvent?: (type:EventType, payload:unknown) => void;
}
interface SharedConnState {
  es: EventSource | null;
  orders: Record<number,LiveOrder>;
  ids: number[];
  connected: 'connecting'|'open'|'closed';
  listeners: Set<SharedConnListener>;
  status?: string; // active filter
  refCount: number;
}
interface GlobalOrdersSingleton {
  __ORDERS_STREAM_SHARED__?: SharedConnState
}
const globalWithSingleton = globalThis as unknown as GlobalOrdersSingleton
const shared: SharedConnState = globalWithSingleton.__ORDERS_STREAM_SHARED__ || { es:null, orders:{}, ids:[], connected:'closed', listeners:new Set(), status: undefined, refCount:0 }
globalWithSingleton.__ORDERS_STREAM_SHARED__ = shared
let notifyScheduled = false
function notifyShared() {
  if (notifyScheduled) return
  notifyScheduled = true
  queueMicrotask(()=> {
    notifyScheduled = false
    for (const l of shared.listeners) {
      l.setConnected(shared.connected)
      l.setOrders(prev => prev === shared.orders ? prev : { ...shared.orders })
      l.setIds(prev => {
        const sameLength = prev.length === shared.ids.length
        if (sameLength) {
          for (let i=0;i<prev.length;i++) if (prev[i] !== shared.ids[i]) { return shared.ids.slice() }
          return prev // identical
        }
        return shared.ids.slice()
      })
    }
  })
}

export function useOrdersStream(opts: UseOrdersStreamOptions = {}) {
  const { status, sessionReady = true, leaderCoordination = false, onStateChange, onEvent, onLeader } = opts
  const [orders,setOrders] = useState<Record<number,LiveOrder>>(shared.orders)
  const [ids,setIds] = useState<number[]>(shared.ids)
  const [connected,setConnected] = useState<'connecting'|'open'|'closed'>(shared.connected === 'closed' ? 'connecting' : shared.connected)
  const esRef = useRef<EventSource|null>(shared.es)
  const bcRef = useRef<BroadcastChannel | null>(null)
  const leaderIdRef = useRef<string>('')
  const isLeaderRef = useRef<boolean>(false)
  const [leader,setLeader] = useState(false)
  const leaderIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null)
  // removed unused leaderStopAttemptRef
  const backoffRef = useRef(1000)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const watchdogTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  // Session gating
  useEffect(()=>{
    if (!sessionReady) {
      // close any existing connection
      if (esRef.current) { try { esRef.current.close() } catch {} esRef.current = null }
      setConnected('closed')
    }
  },[sessionReady])

  const apply = useCallback((type:EventType, payload:unknown) => {
    if (typeof payload !== 'object' || payload === null) return
    const p = payload as Partial<LiveOrder> & { id?:number }
    if (typeof p.id !== 'number') return
    const pid = p.id
    const existing = shared.orders[pid]
    if (type === 'order.created') {
      shared.orders[pid] = { ...(existing||{}), ...p } as LiveOrder
    } else if (type === 'order.updated') {
      shared.orders[pid] = { ...(existing||{}), ...p } as LiveOrder
    } else if (type === 'order.deleted') {
      delete shared.orders[pid]
    }
    shared.ids = Object.values(shared.orders).sort((a,b)=> (a.created_at < b.created_at ? 1 : -1)).map(o=>o.id)
    notifyShared()
  },[])

  // Local orders state stays in sync via shared.notify

  // Periodically purge any lingering served orders (safety net)
  useEffect(() => {
    const interval = setInterval(() => {
      let changed = false
      for (const id in shared.orders) {
        const o = shared.orders[id as unknown as number]
        if (o?.status === 'served') { delete shared.orders[id as unknown as number]; changed = true }
      }
      if (changed) {
        shared.ids = Object.values(shared.orders).sort((a,b)=> (a.created_at < b.created_at ? 1 : -1)).map(o=>o.id)
        notifyShared()
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const resetWatchdog = useCallback(()=>{
    if (watchdogTimer.current) clearTimeout(watchdogTimer.current)
    watchdogTimer.current = setTimeout(()=>{
      // No events (including pings) for threshold -> force reconnect
      if (esRef.current) { try { esRef.current.close() } catch {} }
      esRef.current = null
      setConnected('closed')
      connect() // will reassign below
    }, 35000) // server pings every 25s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const broadcastEvent = useCallback((type:EventType, payload:unknown) => {
    if (!leaderCoordination) return
    if (!isLeaderRef.current) return
    if (!bcRef.current) return
    try { bcRef.current.postMessage({ type, payload }) } catch {}
  },[leaderCoordination])

  const connect = useCallback(()=>{
    if (shared.es && shared.connected === 'open') return
    if (shared.es && shared.connected === 'connecting') return
    // Reuse shared connection if exists & status matches
    if (shared.es && shared.connected !== 'closed') {
      esRef.current = shared.es
      setConnected(shared.connected)
      return
    }
    if (shared.es) { try { shared.es.close() } catch {} shared.es = null }
    shared.connected = 'connecting'
    notifyShared()
    onStateChange?.('connecting')
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    shared.status = status
    const es = new EventSource(`/api/stream/orders?${qs}`)
    shared.es = es
    esRef.current = es
    es.onopen = () => { shared.connected='open'; backoffRef.current = 1000; notifyShared(); onStateChange?.('open'); resetWatchdog() }
    es.onerror = (event: Event) => {
      const target = event.currentTarget as EventSource | null
      const closed = target && target.readyState === EventSource.CLOSED
      if (closed) {
        shared.connected='closed'; notifyShared(); onStateChange?.('closed')
        try { es.close() } catch {}
        return
      }
      shared.connected='closed'; notifyShared(); onStateChange?.('closed')
      es.close()
      if (!reconnectTimer.current) {
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, 15000)
        reconnectTimer.current = setTimeout(()=>{ reconnectTimer.current=null; connect() }, delay)
      }
    }
  es.addEventListener('ping', () => { resetWatchdog() })
    es.addEventListener('order.created', e => { try { const data = JSON.parse(e.data); apply('order.created', data); for (const l of shared.listeners) l.onEvent?.('order.created', data); broadcastEvent('order.created', data) } catch {/*ignore*/} })
    es.addEventListener('order.updated', e => { try { const data = JSON.parse(e.data); apply('order.updated', data); for (const l of shared.listeners) l.onEvent?.('order.updated', data); broadcastEvent('order.updated', data) } catch {/*ignore*/} })
    es.addEventListener('order.deleted', e => { try { const data = JSON.parse(e.data); apply('order.deleted', data); for (const l of shared.listeners) l.onEvent?.('order.deleted', data); broadcastEvent('order.deleted', data) } catch {/*ignore*/} })
  },[status, apply, resetWatchdog, onStateChange, broadcastEvent])

  // Leader coordination
  useEffect(() => {
    if (!leaderCoordination) return
    const KEY = 'orders_stream_leader'
    leaderIdRef.current = Math.random().toString(36).slice(2)
    bcRef.current = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('orders-stream') : null

    const becomeLeader = () => {
      try { localStorage.setItem(KEY, JSON.stringify({ id: leaderIdRef.current, ts: Date.now() })) } catch {}
      isLeaderRef.current = true
      setLeader(true)
      onLeader?.(true)
      connect()
    }
    const resign = () => {
      isLeaderRef.current = false
      setLeader(false)
      onLeader?.(false)
      if (esRef.current) { try { esRef.current.close() } catch {} esRef.current = null }
    }
    const check = () => {
      let rec: { id:string; ts:number } | null = null
      try { const raw = localStorage.getItem(KEY); if (raw) rec = JSON.parse(raw) } catch {}
      const now = Date.now()
      const expired = !rec || (now - rec.ts) > 8000
      if (isLeaderRef.current) {
        // refresh heartbeat
        try { localStorage.setItem(KEY, JSON.stringify({ id: leaderIdRef.current, ts: now })) } catch {}
      } else if (expired) {
        becomeLeader()
      }
    }
    const interval = setInterval(check, 3000)
    leaderIntervalRef.current = interval as unknown as ReturnType<typeof setInterval>
    // initial attempt
    check()

    const storageListener = (e:StorageEvent) => {
      if (e.key !== KEY) return
      let rec: { id:string; ts:number } | null = null
      try { if (e.newValue) rec = JSON.parse(e.newValue) } catch {}
      if (rec && rec.id !== leaderIdRef.current) {
        if (isLeaderRef.current) {
          // Another tab took over; resign
          resign()
        }
      }
    }
    window.addEventListener('storage', storageListener)

    // BroadcastChannel listener for events when not leader
    const bc = bcRef.current
    const bcHandler = (ev: MessageEvent) => {
      if (isLeaderRef.current) return
      const msg = ev.data as { type?:EventType; payload?:unknown }
      if (!msg || !msg.type) return
      apply(msg.type as EventType, msg.payload)
      onEvent?.(msg.type as EventType, msg.payload)
    }
    bc?.addEventListener('message', bcHandler)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', storageListener)
      bc?.removeEventListener('message', bcHandler)
      if (bcRef.current) { try { bcRef.current.close() } catch {} }
    }
  },[leaderCoordination, apply, onEvent, connect, onLeader])

  // Maintain latest onEvent in a ref so we don't recreate listener
  const onEventRef = useRef(onEvent)
  useEffect(()=> { onEventRef.current = onEvent }, [onEvent])

  useEffect(()=>{ 
    if (!sessionReady) return
    const listener: SharedConnListener = { setOrders, setIds, setConnected, onEvent: (t,p)=> onEventRef.current?.(t,p) }
    shared.listeners.add(listener)
    shared.refCount += 1
    // Initial sync
    setOrders(shared.orders)
    setIds(shared.ids)
    setConnected(shared.connected === 'closed' ? 'connecting' : shared.connected)
    if (!shared.es) connect()
    return ()=>{
      shared.listeners.delete(listener)
      shared.refCount = Math.max(0, shared.refCount - 1)
      if (shared.refCount === 0) {
        if (shared.es) { try { shared.es.close() } catch {} }
        shared.es = null
        shared.connected = 'closed'
      }
    }
  },[sessionReady, connect])

  return { state: connected, orders, orderIds: ids, leader }
}
