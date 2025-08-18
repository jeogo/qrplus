"use client"
import { useEffect, useRef, useState } from 'react'

interface StoredItem { id:number; name_ar:string; name_fr:string; price:number; quantity:number; image:string }
interface StoredOrder { id:number; status:string; created_at:string; items:StoredItem[] }

interface PersistentOrderState {
  order: StoredOrder | null
  setInitial(order: StoredOrder): void
  updateStatus(status: string): void
  clear(): void
}

// Hook to persist a single active order for a table (client side only)
export function usePersistentOrder(tableId: string) : PersistentOrderState {
  const key = `qr_order_${tableId}`
  const [order,setOrder] = useState<StoredOrder|null>(null)
  const loadedRef = useRef(false)

  // Load once
  useEffect(()=>{
    if (loadedRef.current) return
    loadedRef.current = true
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      if (raw) {
        const parsed = JSON.parse(raw) as StoredOrder
        if (parsed && typeof parsed.id === 'number') setOrder(parsed)
      }
    } catch { /* ignore */ }
  },[key])

  // Persist on change
  useEffect(()=>{
    if (!order) return
    try { localStorage.setItem(key, JSON.stringify(order)) } catch {/*ignore*/}
  },[order, key])

  const setInitial = (o: StoredOrder) => {
    setOrder(prev => prev && prev.id === o.id ? prev : o)
  }
  const updateStatus = (status: string) => {
    setOrder(prev => prev ? { ...prev, status } : prev)
  }
  const clear = () => {
    setOrder(null)
    try { localStorage.removeItem(key) } catch {/*ignore*/}
  }

  return { order, setInitial, updateStatus, clear }
}
