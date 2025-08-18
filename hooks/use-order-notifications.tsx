"use client"
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { useOrdersStream } from '@/hooks/use-orders-stream'
import { loadNotificationPrefs } from '@/lib/notifications/state'
import { notificationTexts, getLang } from '@/lib/notifications/i18n'

interface LiveOrder { id:number; table_id:number; status:string; total:number; created_at:string; updated_at:string; daily_number?:number }

type EventType = 'order.created'|'order.updated'|'order.deleted'

// Decide if status transition is interesting
function classifyEvent(type: EventType, order: LiveOrder | undefined, prev: LiveOrder | undefined) {
  if (!order) return null
  if (type === 'order.created') return 'new'
  if (type === 'order.updated') {
    const prevStatus = prev?.status
    if (prevStatus !== order.status) {
    if (order.status === 'approved') return 'approved'
  if (order.status === 'ready') return 'ready'
  if (order.status === 'served') return 'served'
    }
  }
  if (type === 'order.deleted') return 'cancelled'
  return null
}

export function useOrderNotifications() {
  const { user } = useSession()
  const ordersRef = useRef<Record<number, LiveOrder>>({})
  const lastShownRef = useRef<Map<string, number>>(new Map())
  const prefsRef = useRef(loadNotificationPrefs())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const bcRef = useRef<BroadcastChannel | null>(null)
  // Lazy init audio (only after user authenticated)
  useEffect(()=>{
    if (!user) return
    if (!prefsRef.current.enableSound) return
    if (!audioRef.current) {
      try { audioRef.current = new Audio('/notification.wav') } catch {}
    }
    const unlock = () => {
      if (!audioRef.current) return
      audioRef.current.muted = true
      audioRef.current.play().then(()=>{
        audioRef.current!.pause()
        audioRef.current!.currentTime = 0
        audioRef.current!.muted = false
        setAudioUnlocked(true)
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
      }).catch(()=>{/* ignore */})
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  },[user])

  // Setup BroadcastChannel for dedupe with SW only when user present
  useEffect(()=>{
    if (!user) {
      try { bcRef.current?.close() } catch {}
      bcRef.current = null
      return
    }
    try { bcRef.current = new BroadcastChannel('notifications-sync') } catch {}
    return () => { try { bcRef.current?.close() } catch {} }
  },[user])

  // Request notification permission only after auth (avoid prompting anonymous users)
  useEffect(()=>{
    if (!user) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      const t = setTimeout(()=>{ Notification.requestPermission().catch(()=>{}) }, 500)
      return ()=> clearTimeout(t)
    }
  },[user])

  // Refresh prefs on focus (only relevant when logged in)
  useEffect(()=>{
    if (!user) return
    const handler = () => { prefsRef.current = loadNotificationPrefs() }
    window.addEventListener('focus', handler)
    return ()=> window.removeEventListener('focus', handler)
  },[user])

  const hasUser = !!user
  const stream = useOrdersStream({
    sessionReady: hasUser,
    onEvent: (type, payload) => {
      if (!user) return
      if (!prefsRef.current.enableToasts) return
      const role = user.role as 'admin'|'kitchen'|'waiter'|string
      const lang = getLang()

      if (typeof payload !== 'object' || payload === null) return
      const data = payload as Partial<LiveOrder> & { id?:number }
      if (typeof data.id !== 'number') return

      const existing = ordersRef.current[data.id]
      const merged: LiveOrder = { ...(existing||{} as LiveOrder), ...(data as LiveOrder) }
      ordersRef.current[data.id] = merged

      const kind = classifyEvent(type as EventType, merged, existing)
      if (!kind) return

      const now = Date.now()
      const key = `${data.id}:${kind}`
      const last = lastShownRef.current.get(key) || 0
      if (now - last < prefsRef.current.dedupeMs) return

      const p = prefsRef.current.roles
      let allowed = false
      if (role === 'kitchen') {
        if (kind === 'new' && p.kitchen.newOrder) allowed = true
        if (kind === 'approved' && p.kitchen.approved) allowed = true
        if (kind === 'cancelled' && p.kitchen.cancelled) allowed = true
      }
      if (role === 'waiter') {
        if (kind === 'ready' && p.waiter.ready) allowed = true
        if (kind === 'served' && p.waiter.served) allowed = true
        if (kind === 'cancelled' && p.waiter.cancelled) allowed = true
      }
      if (role === 'admin') {
        if (kind === 'new' && p.admin.newOrder) allowed = true
        if (kind === 'approved' && p.admin.approved) allowed = true
        if (kind === 'ready' && p.admin.ready) allowed = true
        if (kind === 'served' && p.admin.served) allowed = true
        if (kind === 'cancelled' && p.admin.cancelled) allowed = true
      }
      if (!allowed) return

      lastShownRef.current.set(key, now)

      // Build message
      let message = ''
      const num = merged.daily_number ?? merged.id
  if (kind === 'new') message = notificationTexts.newOrder[lang](num, merged.table_id)
  else if (kind === 'approved') message = notificationTexts.orderApproved[lang](num, merged.table_id)
  else if (kind === 'ready') message = notificationTexts.orderReady[lang](num, merged.table_id)
  else if (kind === 'served') message = notificationTexts.orderServed[lang](num)
  else if (kind === 'cancelled') message = notificationTexts.orderCancelled[lang](num, merged.table_id)

  // Broadcast to SW for dedupe (avoid system notification if push arrives soon)
  try { bcRef.current?.postMessage({ key, ts: now }) } catch {}

  // Play sound if enabled and unlocked
  if (prefsRef.current.enableSound && audioRef.current && audioUnlocked) {
        try {
          // Reset for rapid successive events
          audioRef.current.currentTime = 0
          void audioRef.current.play()
        } catch {}
      }

      toast(message, {
        duration: 5000,
        // Basic styling hint; sonner classes already themed
        className: kind === 'ready' ? 'border-green-500' : kind === 'new' ? 'border-blue-500' : 'border-gray-400'
      })
    }
  })

  return { state: stream.state }
}
