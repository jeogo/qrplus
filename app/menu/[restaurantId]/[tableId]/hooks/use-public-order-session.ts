"use client";
import { useCallback, useEffect, useMemo, useState } from 'react'
import { OrderTracking } from '@/lib/order-tracking'

export interface PublicCategory { id:number; name:string; description?:string; image_url?:string }
export interface PublicProduct { id:number; name:string; name_ar?:string; name_fr?:string; description?:string; price:number; image_url?:string; available?:boolean }
export interface CartItem { id:number; name_ar:string; name_fr:string; price:number; quantity:number; image:string }
export type OrderStatus = 'pending'|'accepted'|'preparing'|'ready'|'served'
export interface Order { id:number; table_id:string; status:OrderStatus; total_amount:number; created_at:string; items:{ product_id:number; quantity:number; price:number; product_name:string }[] }
export interface RestaurantMeta { id:number; restaurant_name:string; logo_url?:string; language:'ar'|'fr'|'en'; currency:string; is_active:boolean }

interface UsePublicOrderSessionArgs { restaurantId:string; tableId:string }

export function usePublicOrderSession({ restaurantId, tableId }:UsePublicOrderSessionArgs){
  // NOTE: tableId here refers to the public table_number (dense per account) not the internal Firestore doc id.
  // Internal numeric id is still embedded in QR at creation time but we now rewrite QR to use table_number.
  const [meta,setMeta] = useState<RestaurantMeta|null>(null)
  const [categories,setCategories] = useState<PublicCategory[]>([])
  const [products,setProducts] = useState<PublicProduct[]>([])
  const [selectedCategory,setSelectedCategory] = useState<number|null>(null)
  const [cart,setCart] = useState<CartItem[]>([])
  const [orders,setOrders] = useState<Order[]>([])
  const [activeOrderId,setActiveOrderId] = useState<number|null>(null)

  const [loadingCats,setLoadingCats] = useState(false)
  const [loadingProducts,setLoadingProducts] = useState(false)
  const [submitting,setSubmitting] = useState(false)
  const [addingToCart,setAddingToCart] = useState<number|null>(null)
  const [errorCats,setErrorCats] = useState<string|null>(null)
  const [errorProducts,setErrorProducts] = useState<string|null>(null)

  const fetchMeta = useCallback(async()=>{
    try { const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/meta`,{ cache:'no-store' }); const json = await res.json(); if(json.success) setMeta(json.data) } catch {}
  },[restaurantId,tableId])

  const fetchCategories = useCallback(async()=>{
    setLoadingCats(true); setErrorCats(null)
    try { const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/categories`); const json = await res.json().catch(()=>({ success:false })); if(json.success) setCategories(json.data); else setErrorCats('FAILED') } finally { setLoadingCats(false) }
  },[restaurantId,tableId])

  const fetchProducts = useCallback(async(categoryId:number)=>{
    setLoadingProducts(true); setErrorProducts(null)
    try { const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/products?category_id=${categoryId}`); const json = await res.json().catch(()=>({ success:false })); if(json.success) setProducts(json.data); else setErrorProducts('FAILED') } finally { setLoadingProducts(false) }
  },[restaurantId,tableId])

  const selectCategory = useCallback((cid:number)=>{ setSelectedCategory(cid); fetchProducts(cid) },[fetchProducts])

  useEffect(()=>{ const loaded = OrderTracking.loadCart(tableId); setCart(Array.isArray(loaded)? loaded as CartItem[] : []); const savedOrderId = OrderTracking.load(tableId); if(savedOrderId) setActiveOrderId(savedOrderId) },[tableId])
  useEffect(()=>{ OrderTracking.saveCart(tableId, cart) },[cart, tableId])

  useEffect(()=>{ fetchMeta(); fetchCategories() },[fetchMeta, fetchCategories])

  const addToCart = useCallback((p:PublicProduct, quantity=1)=>{
    setAddingToCart(p.id)
    setCart(prev=>{
      const ex = prev.find(i=>i.id===p.id)
      if(ex) return prev.map(i=> i.id===p.id? { ...i, quantity: i.quantity + quantity }:i)
      return [...prev, { id:p.id, name_ar:p.name_ar || p.name, name_fr:p.name_fr || p.name, price:p.price, quantity, image:p.image_url||'' }]
    })
    setTimeout(()=> setAddingToCart(null), 400)
  },[])
  const inc = useCallback((id:number)=> setCart(prev=> prev.map(i=> i.id===id? { ...i, quantity: i.quantity+1 }:i)),[])
  const dec = useCallback((id:number)=> setCart(prev=> prev.flatMap(i=>{ if(i.id!==id) return [i]; if(i.quantity>1) return [{...i, quantity:i.quantity-1}]; return [] })),[])
  const remove = useCallback((id:number)=> setCart(prev=> prev.filter(i=> i.id!==id)),[])

  const submit = useCallback(async(note:string)=>{
    if(!cart.length || submitting) return null
    setSubmitting(true)
    try {
      const payload = { items: cart.map(c=> ({ product_id:c.id, quantity:c.quantity })), note }
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/orders`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const json = await res.json().catch(()=>({ success:false }))
      if(json.success){
        const order = json.data.order || json.data
        OrderTracking.save(tableId, order.id)
        setActiveOrderId(order.id)
        setOrders([{ id: order.id, table_id: String(order.table_id||tableId), status:'pending', total_amount:0, created_at:new Date().toISOString(), items:[] }])
        setCart([])
        return order.id
      }
    } finally { setSubmitting(false) }
    return null
  },[cart, submitting, restaurantId, tableId])

  const cartTotal = useMemo(()=> cart.reduce((s,i)=> s + i.price*i.quantity, 0),[cart])
  const cartCount = useMemo(()=> cart.reduce((s,i)=> s + i.quantity, 0),[cart])

  return {
    meta, categories, products, selectedCategory, cart, orders, activeOrderId,
    loadingCats, loadingProducts, submitting, addingToCart,
    errorCats, errorProducts,
    selectCategory, fetchCategories, fetchProducts, setSelectedCategory,
    addToCart, inc, dec, remove,
    submit,
    cartTotal, cartCount,
    setOrders, setActiveOrderId
  }
}
