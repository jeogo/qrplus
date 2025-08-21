"use client";
import { useParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getPublicMenuTexts } from '@/lib/i18n/public-menu'
import { useSystemActive } from '@/hooks/use-system-active'
import { usePersistentOrder } from '@/hooks/use-persistent-order'
import { OrderTracking } from '@/lib/order-tracking'
import { usePublicOrderSession } from '../hooks/use-public-order-session'
import { Header } from './Header'
import { CategoryGrid } from './CategoryGrid'
import { ProductGrid } from './ProductGrid'
import { CartDialog } from './CartDialog'
import { OrderTrackerDialog } from './OrderTrackerDialog'
import { FloatingActions } from './FloatingActions'
import { Clock } from 'lucide-react'

export function PublicMenuPage(){
  const { restaurantId, tableId } = useParams() as { restaurantId: string; tableId: string }
  const [language, setLanguage] = useState<'ar'|'fr'|'en'>('ar')
  const [mounted, setMounted] = useState(false)
  const t = getPublicMenuTexts(language)
  const session = usePublicOrderSession({ restaurantId, tableId })
  const { meta, categories, products, selectedCategory, cart, orders, activeOrderId, loadingCats, loadingProducts, submitting, addingToCart, errorCats, errorProducts, selectCategory, fetchCategories, fetchProducts, setSelectedCategory, addToCart, inc, dec, remove, submit, cartTotal, cartCount, setOrders, setActiveOrderId } = session
  const [showCart, setShowCart] = useState(false)
  const [showOrderTracker, setShowOrderTracker] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [audioNotifications, setAudioNotifications] = useState(true)
  const systemActive = useSystemActive(true)
  const persistent = usePersistentOrder(tableId)
  const audioRef = useRef<HTMLAudioElement|null>(null)
  const sseControllerRef = useRef<AbortController | null>(null)

  useEffect(()=>{ setMounted(true); try{ audioRef.current = new Audio('/notification.wav'); audioRef.current.volume = .6 }catch{}; const savedLang = localStorage.getItem('qr_menu_lang') as 'ar'|'fr'|'en'|null; if(savedLang) setLanguage(savedLang); const savedOrderId = OrderTracking.load(tableId); if(savedOrderId) setActiveOrderId(savedOrderId) },[tableId, setActiveOrderId])
  useEffect(()=>{ try{ localStorage.setItem('qr_menu_lang', language) }catch{} },[language])
  useEffect(()=>{ if(meta?.language && meta.language !== language) setLanguage(meta.language) },[meta, language])
  const playNotificationSoundRef = useRef(()=>{ if(audioNotifications && audioRef.current){ try{ audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}) }catch{} } })
  useEffect(()=>{ if(!activeOrderId || !mounted) return; (async()=>{ try{ const { connectPublicOrderStatus } = await import('@/lib/public-order-sse'); sseControllerRef.current = new AbortController(); connectPublicOrderStatus({ orderId: activeOrderId, onStatus:(data)=>{ setOrders(prev=>{ const status = data.status as typeof prev[number]['status']; const exist= prev.find(o=> o.id===data.id); if(exist){ if(exist.status !== status){ if(status==='ready' || status==='served') playNotificationSoundRef.current(); if(status==='served'){ OrderTracking.clear(tableId); setActiveOrderId(null) } persistent.updateStatus(status) } return prev.map(o=> o.id===data.id? { ...o, status }:o) } return [{ id:data.id, table_id:String(data.table_id), status, total_amount:0, created_at:new Date().toISOString(), items:[] }]}); }, onDeleted:()=>{ setActiveOrderId(null); persistent.clear(); setOrders([]); OrderTracking.clear(tableId); playNotificationSoundRef.current() } }) }catch(e){ console.error('SSE failed', e) } })(); return ()=>{ if(sseControllerRef.current){ sseControllerRef.current.abort(); sseControllerRef.current=null } } },[activeOrderId, mounted, persistent, setActiveOrderId, setOrders, tableId])
  const canOrder = !activeOrderId && cart.length>0
  const handleSubmit = useCallback(async()=>{ if(!canOrder) return; const id = await submit(orderNote); if(id){ persistent.setInitial({ id, status:'pending', created_at:new Date().toISOString(), items:[] }); setOrderNote(''); setShowCart(false); if(audioRef.current){ try{ audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}) }catch{} } } },[canOrder, submit, orderNote, persistent])
  if(!systemActive){ return (<div className="min-h-screen flex items-center justify-center p-4"><div className="w-full max-w-md rounded-2xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl p-8 text-center space-y-4"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Clock className="h-8 w-8 text-muted-foreground" /></div><h2 className="text-xl font-semibold tracking-tight">{t.systemInactive}</h2><p className="text-sm text-muted-foreground leading-relaxed">{t.systemInactiveMessage}</p></div></div>) }
  if(!mounted){ return (<div className="min-h-screen flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="h-12 w-12 rounded-full border-2 border-border border-t-transparent animate-spin" aria-label={t.loading} /><p className="text-xs text-muted-foreground tracking-wide uppercase">{t.loading}</p></div></div>) }
  return (
    <div className={`min-h-screen ${language==='ar'? 'rtl':'ltr'} bg-gradient-to-b from-background via-background to-background`}>
  <Header meta={meta} restaurantId={restaurantId} tableId={tableId} t={t} onToggleLanguage={()=> setLanguage(l=> l==='ar' ? 'fr' : (l==='fr' ? 'en' : 'ar'))} cartCount={cartCount} hasActiveOrder={!!activeOrderId} onOpenCart={()=> setShowCart(true)} onOpenTracker={()=> setShowOrderTracker(true)} />
      <main className="mx-auto max-w-5xl p-4 pb-32">
        {!selectedCategory && (<CategoryGrid categories={categories} loading={loadingCats} error={errorCats} t={t} onRetry={fetchCategories} onSelect={selectCategory} />)}
        {selectedCategory && (<ProductGrid products={products} loading={loadingProducts} error={errorProducts} t={t} currency={meta?.currency || t.dzd} language={language} onRetry={()=> selectedCategory && fetchProducts(selectedCategory)} onBack={()=> setSelectedCategory(null)} onAdd={addToCart} onInc={inc} onDec={dec} addingId={addingToCart} inCartQty={(id)=> cart.find(c=> c.id===id)?.quantity || 0} />)}
      </main>
      <OrderTrackerDialog open={showOrderTracker} onOpenChange={setShowOrderTracker} orders={orders} t={t} currency={meta?.currency || t.dzd} />
      <CartDialog open={showCart} onOpenChange={setShowCart} cart={cart} t={t} language={language} currency={meta?.currency || t.dzd} cartCount={cartCount} cartTotal={cartTotal} orderNote={orderNote} onChangeNote={setOrderNote} onDec={dec} onInc={inc} onRemove={remove} onSubmit={handleSubmit} submitting={submitting} canOrder={canOrder} />
      <FloatingActions t={t} cartCount={cartCount} hasActiveOrder={!!activeOrderId} onOpenCart={()=> setShowCart(true)} onOpenTracker={()=> setShowOrderTracker(true)} />
      <div className="fixed bottom-6 left-6 z-40"><button onClick={()=> setAudioNotifications(a=> !a)} aria-label={audioNotifications? t.disableAudio : t.enableAudio} className={`rounded-full h-10 w-10 flex items-center justify-center backdrop-blur border border-border/60 shadow-sm hover:shadow-md transition-all ${audioNotifications? 'bg-white/70 dark:bg-white/10':'bg-background/80'}`}>{audioNotifications? '🔊':'🔇'}</button></div>
      <div aria-live="polite" className="sr-only">{orders.map(o => `${t.order} ${o.id} ${t[o.status]}`).join('. ')}</div>
    </div>
  )
}

