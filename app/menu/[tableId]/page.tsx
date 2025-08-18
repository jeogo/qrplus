"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePersistentOrder } from '@/hooks/use-persistent-order'
import { useSystemActive } from '@/hooks/use-system-active'
import { handleSystemInactive } from '@/lib/system-active'
import { PublicSystemInactive } from '@/components/public-system-inactive'
import { OrderTracking } from '@/lib/order-tracking'
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Globe, Minus, Plus, ChefHat, Clock, CheckCircle, Truck, Star, Loader2, Trash2 } from "lucide-react"
import { useParams } from "next/navigation"

interface PublicCategory { id: number; name: string; image_url?: string; description?: string }
interface PublicProduct { id: number; category_id: number; name: string; description?: string; price: number; available: boolean; image_url?: string }

interface CartItem {
  id: number
  name_ar: string
  name_fr: string
  price: number
  quantity: number
  image: string
}

interface Product {
  id: number
  category_id: number
  name_ar: string
  name_fr: string
  description_ar: string
  description_fr: string
  price: number
  available: boolean
  image: string
}

interface Order {
  id: number
  table_id: string
  status: "pending" | "approved" | "ready" | "served"
  total_amount: number
  created_at: string
  items: CartItem[]
}
interface RestaurantMeta { restaurant_name: string; logo_url: string; currency: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD'; language: 'ar' | 'fr'; address: string; phone: string }

// New lightweight UI translation additions
// (Avoid restructuring existing translations object; add keys inline for brevity)

const translations = {
  ar: {
    restaurantName: "مطعم الأصالة",
    tableNumber: "طاولة رقم",
    selectCategory: "اختر الفئة",
    backToCategories: "العودة للفئات",
    addToCart: "إضافة للسلة",
    unavailable: "غير متوفر",
    cart: "السلة",
    total: "المجموع",
    orderNow: "اطلب الآن",
    quantity: "الكمية",
    dzd: "د.ج",
    empty: "فارغ",
    itemsInCart: "عنصر في السلة",
    orderPlaced: "تم إرسال الطلب",
    orderSuccess: "تم إرسال طلبك بنجاح! سيتم إعداده قريباً.",
    orderTracking: "تتبع الطلب",
    orderStatus: "حالة الطلب",
    pending: "قيد الانتظار",
    approved: "موافق عليه",
    ready: "جاهز",
    served: "تم التقديم",
    orderNumber: "رقم الطلب",
    estimatedTime: "الوقت المتوقع",
    minutes: "دقيقة",
    yourOrders: "طلباتك",
    noOrders: "لا توجد طلبات",
    orderAgain: "اطلب مرة أخرى",
    submittingOrder: "جاري إرسال الطلب...",
    orderLocked: "يوجد طلب قيد التنفيذ لهذه الطاولة",
    orderSubmittedToast: "تم إرسال الطلب بنجاح",
    orderReadyToast: "طلبك جاهز!",
    orderServedToast: "تم تقديم طلبك. شهية طيبة!",
    view: "عرض",
    remove: "حذف",
    noteOptional: "ملاحظة (اختياري)",
    notePlaceholder: "أي طلبات خاصة؟",
    // Additional translations for UI completeness
    welcomeTo: "مرحباً بك في",
    discoverMenu: "اكتشف قائمتنا اللذيذة بتحديد فئة أعلاه",
    tapCategory: "اضغط على الفئة لعرض المنتجات",
    noCategories: "لا توجد فئات",
    noDescription: "لا يوجد وصف",
    open: "فتح",
    adding: "جاري الإضافة...",
    each: "للقطعة الواحدة",
    itemsSelected: "عنصر محدد",
    orderReady: "طلبك جاهز للاستلام",
    startByAdding: "ابدأ بإضافة عناصر إلى سلتك",
    trackOrderStatus: "تتبع حالة طلبك",
    disableSounds: "إيقاف الأصوات",
    enableSounds: "تشغيل الأصوات",
  },
  fr: {
    restaurantName: "Restaurant Authenticité",
    tableNumber: "Table N°",
    selectCategory: "Sélectionner une catégorie",
    backToCategories: "Retour aux catégories",
    addToCart: "Ajouter au panier",
    unavailable: "Indisponible",
    cart: "Panier",
    total: "Total",
    orderNow: "Commander",
    quantity: "Quantité",
    dzd: "DZD",
    empty: "Vide",
    itemsInCart: "articles dans le panier",
    orderPlaced: "Commande envoyée",
    orderSuccess: "Votre commande a été envoyée avec succès! Elle sera préparée bientôt.",
    orderTracking: "Suivi de commande",
    orderStatus: "Statut de la commande",
    pending: "En attente",
    approved: "Approuvée",
    ready: "Prête",
    served: "Servie",
    orderNumber: "N° de commande",
    estimatedTime: "Temps estimé",
    minutes: "minutes",
    yourOrders: "Vos commandes",
    noOrders: "Aucune commande",
    orderAgain: "Commander à nouveau",
    submittingOrder: "Envoi de la commande...",
    orderLocked: "Une commande est déjà en cours pour cette table",
    orderSubmittedToast: "Commande envoyée",
    orderReadyToast: "Votre commande est prête !",
    orderServedToast: "Votre commande a été servie. Bon appétit !",
    view: "Voir",
    remove: "Supprimer",
    noteOptional: "Note (optionnel)",
    notePlaceholder: "Une demande spéciale?",
    // Additional translations for UI completeness
    welcomeTo: "Bienvenue chez",
    discoverMenu: "Découvrez notre délicieux menu en sélectionnant une catégorie ci-dessus",
    tapCategory: "Appuyez sur une catégorie pour voir les produits",
    noCategories: "Aucune catégorie",
    noDescription: "Aucune description fournie",
    open: "Ouvrir",
    adding: "Ajout...",
    each: "chacun",
    itemsSelected: "articles sélectionnés",
    orderReady: "Votre commande est prête à être récupérée",
    startByAdding: "Commencez par ajouter des articles à votre panier",
    trackOrderStatus: "Suivez l'état de votre commande",
    disableSounds: "Désactiver les sons",
    enableSounds: "Activer les sons",
  },
}

export default function MenuPage() {
  const params = useParams()
  const tableId = params.tableId as string

  const [language, setLanguage] = useState<"ar" | "fr">("ar")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Initialize cart from localStorage immediately
    if (typeof window !== 'undefined') {
      return OrderTracking.loadCart(params.tableId as string) as CartItem[]
    }
    return []
  })
  const [showCart, setShowCart] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  // simple error logging (suppress unused variable lint)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setError = (msg:string)=>{ void msg }
  const [showOrders, setShowOrders] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<number | null>(null)
  // removed legacy isLoading (was for mock splash)
  const [addingToCart, setAddingToCart] = useState<number | null>(null)
  const [categoryTransition, setCategoryTransition] = useState(false)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const restoreAttemptedRef = useRef(false)
  const [audioNotifications, setAudioNotifications] = useState(true)
  const systemActive = useSystemActive(true)
  const [initialCheckDone, setInitialCheckDone] = useState(false)
  const [remoteActive, setRemoteActive] = useState<boolean | null>(null)
  const [meta, setMeta] = useState<RestaurantMeta | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [orderNote, setOrderNote] = useState("")
  // Public push registration state
  const publicPushRef = useRef<{ registered:boolean }>({ registered:false })

  // Initial remote system status (prevents brief flicker if local storage stale)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/public/system-status/${tableId}`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setRemoteActive(json.active)
        }
      } catch {
        if (!cancelled) setRemoteActive(null)
      } finally {
        if (!cancelled) setInitialCheckDone(true)
      }
    }
    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId])

  // Fetch branding meta
  useEffect(()=>{
    let cancelled = false
    const load = async () => {
      try {
        setLoadingMeta(true)
        const res = await fetch(`/api/public/menu/${tableId}/meta`, { cache: 'no-store' })
        const json = await res.json().catch(()=>({ success:false }))
        if (!cancelled && json.success) {
          setMeta(json.data)
          setLanguage(prev => (prev === 'ar' && json.data.language === 'fr') ? 'fr' : (prev === 'fr' && json.data.language === 'ar') ? 'ar' : prev)
        }
      } catch { /* ignore */ } finally { if (!cancelled) setLoadingMeta(false) }
    }
    load()
    return ()=>{ cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId])
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousActiveOrderIdRef = useRef<number | null>(null)
  // SSE controller ref (fallback when RTDB not available)
  const sseControllerRef = useRef<{ close: () => void } | null>(null)

  // Initialize audio
  // (refs for polling defined later after functions)
  useEffect(() => {
    try {
      audioRef.current = new Audio("/notification.wav")
      audioRef.current.volume = 0.5
      audioRef.current.preload = 'auto'
    } catch (error) {
      console.warn('Failed to initialize audio:', error)
    }
  }, [])

  const playNotificationSound = useCallback(() => {
    if (!audioNotifications || !audioRef.current) return
    try {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Ignore audio play failures (browser restrictions)
      })
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }, [audioNotifications])
  const persistent = usePersistentOrder(tableId)
  const rtdbOrderUnsub = useRef<null | (()=>void)>(null)

  // Lazy import (avoid SSR issues) - dynamic require inside effect when needed
  // We'll store subscription functions here once loaded
  interface RtdbSubs { subscribeOrder?: (accountId:number, tableId:number, cb:(data:{active_order_id?:number|null})=>void)=>()=>void; subscribeOrderStatus?: (accountId:number, orderId:number, cb:(data:OrderStatusNode|null)=>void)=>()=>void }
  const rtdbSubs = useRef<RtdbSubs>({})

  interface OrderStatusNode { id:number; table_id:number; status:Order['status']; total?:number; created_at?:string; updated_at?:string }

  const t = translations[language]
  const readyRef = useRef(t.orderReadyToast)
  const servedRef = useRef(t.orderServedToast)
  useEffect(()=>{ readyRef.current = t.orderReadyToast; servedRef.current = t.orderServedToast }, [language, t.orderReadyToast, t.orderServedToast])

  // Move loadOrders function definition before useEffect
  // Placeholder for future public order polling
  // removed unused loadOrders placeholder

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCats(true)
  // reset error ignored
      const res = await fetch(`/api/public/menu/${tableId}/categories`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'FAILED')
      setCategories(json.data || [])
      if (json.data && json.data.length && json.data[0].account_id && !accountId) {
        setAccountId(json.data[0].account_id)
      }
  } catch {
      setError('خطأ في تحميل الفئات')
    } finally { setLoadingCats(false) }
  }, [tableId, accountId])

  const fetchProducts = useCallback(async (categoryId: number) => {
    try {
      setLoadingProducts(true)
  // reset error ignored
      const res = await fetch(`/api/public/menu/${tableId}/products?category_id=${categoryId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'FAILED')
      setProducts(json.data || [])
  } catch {
      setError('خطأ في تحميل المنتجات')
    } finally { setLoadingProducts(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId])

  const fetchMeta = useCallback(async () => {
    try {
      setLoadingMeta(true)
      const res = await fetch(`/api/public/menu/${tableId}/meta`, { cache: 'no-store' })
      const json = await res.json().catch(()=>({ success:false }))
      if (json.success) {
        setMeta(json.data)
        setLanguage(prev => prev === 'ar' && json.data.language === 'fr' ? 'fr' : prev === 'fr' && json.data.language === 'ar' ? 'ar' : prev)
      }
    } catch {/* ignore */} finally { setLoadingMeta(false) }
  }, [tableId])

  useEffect(() => {
    setMounted(true)
    fetchCategories()
    fetchMeta()
  }, [fetchCategories, fetchMeta])

  const registerPublicToken = useCallback(async () => {
    try {
      if (publicPushRef.current.registered) return
      const { acquireFcmToken } = await import('@/lib/firebase/messaging')
      const swReg = await navigator.serviceWorker.ready.catch(()=>null as ServiceWorkerRegistration | null)
      const token = await acquireFcmToken({ serviceWorkerRegistration: swReg || undefined })
      if (!token) return
      await fetch('/api/public/devices/register', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ token, lang: language, tableId, accountId }) })
      publicPushRef.current.registered = true
      console.log('[PUBLIC][PUSH] registered client token')
    } catch (e) {
      console.warn('[PUBLIC][PUSH][register][error]', e)
    }
  }, [language, tableId, accountId])

  // Public push registration (client role) once permission granted
  useEffect(()=>{
    if (publicPushRef.current.registered) return
    if (typeof Notification === 'undefined') return
    const timer = setTimeout(()=>{
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p=>{ if (p === 'granted') registerPublicToken() })
      } else if (Notification.permission === 'granted') {
        registerPublicToken()
      }
    }, 1500)
    return ()=> clearTimeout(timer)
  },[registerPublicToken])

  // Initial hydrate for session & cart & persistent order
  useEffect(()=>{
    try {
      // lightweight client session id (not currently used outside local scope, safe to omit storage usage variable)
      if (!localStorage.getItem(`qr_session_${tableId}`)) {
        localStorage.setItem(`qr_session_${tableId}`, crypto.randomUUID())
      }
    } catch {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  // Restore active order from tracking on first mount only
  useEffect(() => {
    if (restoreAttemptedRef.current) return
    restoreAttemptedRef.current = true
    const savedOrderId = OrderTracking.load(tableId)
    if (!savedOrderId) return
    OrderTracking.fetch(savedOrderId).then(data => {
      if (data?.success) {
        const orderData = data.data.order
        const itemsData = data.data.items
        const restoredOrder: Order = {
          id: orderData.id,
          table_id: String(orderData.table_id),
          status: orderData.status,
          total_amount: orderData.total,
          created_at: orderData.created_at,
          items: itemsData.map((item: {product_id: number, product_name: string, price: number, quantity: number}) => ({
            id: item.product_id,
            name_ar: item.product_name,
            name_fr: item.product_name,
            price: item.price,
            quantity: item.quantity,
            image: '/placeholder.svg'
          }))
        }
        setOrders([restoredOrder])
        setActiveOrderId(savedOrderId)
      } else {
        OrderTracking.clear(tableId)
      }
    }).catch(() => {/* ignore */})
  }, [tableId])

  // Persist cart on change
  useEffect(()=>{
    OrderTracking.saveCart(tableId, cart)
  },[cart, tableId])

  // Hydrate orders list from persistent order once
  useEffect(()=>{
      if (!persistent.order) return
      const po = persistent.order // stable snapshot
      if (po) {
        setOrders(prev => {
          if (prev.length) return prev
          const total = Array.isArray(po.items) ? po.items.reduce((s,i)=> s + i.price * i.quantity, 0) : 0
          return [{ id: po.id, table_id: tableId, status: po.status as Order['status'], total_amount: total, created_at: po.created_at, items: (po.items || []) as CartItem[] }]
        })
        setActiveOrderId(po.id)
      }
  },[persistent.order, tableId])

  // Auto clear after served (grace period for user to see toast/banner)
  useEffect(()=>{
    if (!orders.length) return
    const current = orders[0]
    if (current.status === 'served') {
      const timer = setTimeout(()=>{
        persistent.clear()
        setOrders([])
        setActiveOrderId(null)
      }, 6000)
      return ()=> clearTimeout(timer)
    }
  },[orders, persistent])

  // RTDB subscriptions: active order id + status updates (must appear before any conditional return)
  useEffect(() => {
    if (!accountId) return
    let unsubActive: null | (()=>void) = null
    
    ;(async () => {
      if (!rtdbSubs.current.subscribeOrder) {
        const mod = await import('@/lib/firebase/client-rtdb')
        rtdbSubs.current.subscribeOrder = mod.subscribeOrder
        rtdbSubs.current.subscribeOrderStatus = mod.subscribeOrderStatus as unknown as RtdbSubs['subscribeOrderStatus']
      }
      const { subscribeOrder, subscribeOrderStatus } = rtdbSubs.current
      unsubActive = subscribeOrder!(accountId, Number(tableId), (data:{ active_order_id?:number|null }) => {
        const aoid = data.active_order_id || null
        const previousActiveOrderId = previousActiveOrderIdRef.current
        previousActiveOrderIdRef.current = aoid
        setActiveOrderId(aoid)
        
        // Handle order deletion (active order cleared)
        if (previousActiveOrderId && !aoid) {
          console.log('[CLIENT] Order deletion detected:', previousActiveOrderId, '→', aoid)
          // Order was deleted/declined by admin
          console.log('Order cancelled:', language === "ar" ? "تم إلغاء الطلب" : "Commande annulée")
          persistent.clear()
          setOrders([])
          OrderTracking.clear(tableId)
          playNotificationSound()
        }
        
        if (aoid) {
          if (rtdbOrderUnsub.current) rtdbOrderUnsub.current()
          rtdbOrderUnsub.current = subscribeOrderStatus!(accountId, aoid, (orderNode: OrderStatusNode | null) => {
            if (!orderNode) {
              // Order was deleted while we were subscribed to it
              console.log('[CLIENT] Order node deleted during subscription:', aoid)
              setActiveOrderId(null)
              persistent.clear()
              setOrders([])
              OrderTracking.clear(tableId)
              console.log('Order cancelled:', language === "ar" ? "تم إلغاء الطلب" : "Commande annulée")
              playNotificationSound()
              return
            }
            setOrders(prev => {
              const existing = prev.find(o => o.id === aoid)
              if (existing) {
                const before = existing.status
                const after = orderNode.status
                if (before !== after) {
                  console.log('[CLIENT] Order status change:', before, '→', after)
                  // Play sound for important status changes
                  if (after === 'ready' || after === 'served') {
                    playNotificationSound()
                  }
                  if (after === 'ready') console.log('Order ready:', readyRef.current)
                  if (after === 'served') {
                    console.log('Order served:', servedRef.current)
                    // Clear tracking when order is served
                    OrderTracking.clear(tableId)
                  }
                }
                persistent.updateStatus(after)
                return prev.map(o => o.id === aoid ? { ...o, status: after, created_at: orderNode.created_at || o.created_at } : o)
              }
              const placeholder: Order = {
                id: orderNode.id,
                table_id: String(orderNode.table_id),
                status: orderNode.status,
                total_amount: orderNode.total || 0,
                created_at: orderNode.created_at || new Date().toISOString(),
                items: []
              }
              persistent.setInitial({ id: orderNode.id, status: orderNode.status, created_at: placeholder.created_at, items: [] })
              return [placeholder]
            })
          })
        }
      })
    })()
    return () => {
      if (unsubActive) unsubActive()
      if (rtdbOrderUnsub.current) rtdbOrderUnsub.current()
    }
  }, [accountId, tableId, persistent, language, playNotificationSound])

  // Refs used inside realtime handlers (RTDB/SSE) without re-subscribing
  const playNotificationSoundRef = useRef(playNotificationSound)
  const persistentRef = useRef(persistent)
  const languageRef = useRef(language)
  useEffect(()=>{ playNotificationSoundRef.current = playNotificationSound },[playNotificationSound])
  useEffect(()=>{ persistentRef.current = persistent },[persistent])
  useEffect(()=>{ languageRef.current = language },[language])

  // SSE fallback (uses helper) if RTDB not active
  useEffect(() => {
    // Clean existing SSE if conditions change
    if (sseControllerRef.current) { sseControllerRef.current.close(); sseControllerRef.current = null }
    if (!activeOrderId) return
    if (rtdbOrderUnsub.current) return // RTDB active, no need for SSE

    (async () => {
      const { connectPublicOrderStatus } = await import('@/lib/public-order-sse')
      if (!activeOrderId) return
      sseControllerRef.current = connectPublicOrderStatus({
        orderId: activeOrderId,
      onStatus: (data) => {
        setOrders(prev => {
          const existing = prev.find(o => o.id === data.id)
          if (existing) {
            if (existing.status !== data.status) {
              console.log('[PUBLIC][SSE] Status change', existing.status, '→', data.status)
              if (data.status === 'ready' || data.status === 'served') playNotificationSoundRef.current()
              if (data.status === 'ready') console.log('Order ready:', readyRef.current)
              if (data.status === 'served') { console.log('Order served:', servedRef.current); OrderTracking.clear(tableId) }
              persistentRef.current.updateStatus(data.status)
            }
            return prev.map(o => o.id === data.id ? { ...o, status: data.status as Order['status'] } : o)
          }
          return [{ id: data.id, table_id: String(data.table_id), status: data.status as Order['status'], total_amount: prev[0]?.total_amount || 0, created_at: prev[0]?.created_at || new Date().toISOString(), items: prev[0]?.items || [] }]
        })
      },
        onDeleted: () => {
        setActiveOrderId(null)
        persistentRef.current.clear()
        setOrders([])
        OrderTracking.clear(tableId)
        console.log('Order cancelled:', languageRef.current === 'ar' ? 'تم إلغاء الطلب' : 'Commande annulée')
        playNotificationSoundRef.current()
        },
        onRetry: (attempt, delay) => {
        console.warn('[PUBLIC][SSE] retry', attempt, 'in', delay, 'ms')
        },
        onFinalError: () => {
        console.error('[PUBLIC][SSE] giving up after max retries')
        }
      })
    })()
    return () => { if (sseControllerRef.current) { sseControllerRef.current.close(); sseControllerRef.current = null } }
  }, [activeOrderId, tableId])

  if (!mounted || loadingCats || loadingMeta) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="p-4 bg-primary/10 rounded-full mb-4 mx-auto w-fit animate-pulse">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-32 mx-auto animate-shimmer"></div>
            <div className="h-3 bg-muted rounded w-24 mx-auto animate-shimmer"></div>
          </div>
        </div>
      </div>
    )
  }

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "ar" ? "fr" : "ar"))
  }

  const addToCart = async (product: Product) => {
    if (activeOrderId) { setShowOrders(true); return }
    setAddingToCart(product.id)

    // Haptic-like feedback simulation
    await new Promise((resolve) => setTimeout(resolve, 200))

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [
        ...prev,
        {
          id: product.id,
          name_ar: product.name_ar,
          name_fr: product.name_fr,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ]
    })

    setAddingToCart(null)
  }

  const selectCategory = async (categoryId: number) => {
    setCategoryTransition(true)
    await new Promise((resolve) => setTimeout(resolve, 150))
    setSelectedCategory(categoryId)
    fetchProducts(categoryId)
    setCategoryTransition(false)
  }

  const updateQuantity = (id: number, change: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    })
  }

  const removeItem = (id: number) => {
    setCart(prev => prev.filter(it => it.id !== id))
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const filteredProducts = selectedCategory ? products.filter(p => p.category_id === selectedCategory) : []

  const selectedCategoryData = categories.find((cat) => cat.id === selectedCategory)

  const submitOrder = async () => {
    if (cart.length === 0) return
    // Enforce single active order client-side (server also enforces)
    if (orders.some(o => o.status !== 'served')) {
      setShowOrders(true)
      return
    }
    if (!systemActive) {
      handleSystemInactive(language)
      return
    }

    setIsSubmittingOrder(true)
    try {
      const payload = {
        items: cart.map(ci => ({ product_id: ci.id, quantity: ci.quantity })),
        note: orderNote.trim() || undefined
      }
  const res = await fetch(`/api/public/menu/${tableId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'ACTIVE_ORDER_EXISTS' && json.data?.order_id) {
          setActiveOrderId(json.data.order_id)
          setShowOrders(true)
          return // graceful exit
        }
        console.error('[ORDER][ERROR]', json.error)
        return
      }
      const orderData = json.data.order
      const itemsData = json.data.items as { product_id:number; product_name:string; quantity:number; price:number }[]
      if (orderData.account_id && !accountId) setAccountId(orderData.account_id)
      const mapped: Order = {
        id: orderData.id,
        table_id: String(orderData.table_id),
        status: orderData.status,
        total_amount: orderData.total,
        created_at: orderData.created_at,
        items: itemsData.map(it => ({
          id: it.product_id,
          name_ar: it.product_name,
          name_fr: it.product_name,
          price: it.price,
          quantity: it.quantity,
          image: '/placeholder.svg'
        }))
      }
  setOrders([mapped])
  // Save order ID for persistence
  OrderTracking.save(tableId, mapped.id)
  persistent.setInitial({ id: mapped.id, status: mapped.status, created_at: mapped.created_at, items: mapped.items.map(i=>({ id:i.id, name_ar:i.name_ar, name_fr:i.name_fr, price:i.price, quantity:i.quantity, image:i.image })) })
      setLastOrderId(mapped.id)
      // Clear cart after successful order
      setCart([])
      OrderTracking.clearCart(tableId)
      setShowCart(false)
      setShowOrders(true)
      setActiveOrderId(mapped.id)
  console.log('Order submitted:', t.orderSubmittedToast)
    } catch (e) {
      console.error('[PUBLIC][ORDER][SUBMIT]', e)
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "ready":
        return <Truck className="h-4 w-4" />
      case "served":
        return <Star className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "ready":
        return "bg-green-100 text-green-800 border-green-200 animate-success-pulse"
      case "served":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getEstimatedTime = (status: Order["status"], createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))

    switch (status) {
      case "pending":
        return `${Math.max(0, 5 - elapsed)} ${t.minutes}`
      case "approved":
        return `${Math.max(0, 20 - elapsed)} ${t.minutes}`
      case "ready":
        return t.ready
      case "served":
        return t.served
      default:
        return ""
    }
  }

  const effectiveActive = remoteActive === null ? systemActive : remoteActive
  if (initialCheckDone && effectiveActive === false) {
    return <PublicSystemInactive language={language} onRetry={()=>{
      setInitialCheckDone(false); setRemoteActive(null);
      fetch(`/api/public/system-status/${tableId}`).then(r=>r.json()).then(j=>{ if (j.success) { setRemoteActive(j.active); setInitialCheckDone(true) } else { setRemoteActive(false); setInitialCheckDone(true)} }).catch(()=>{ setRemoteActive(false); setInitialCheckDone(true) })
    }} />
  }

  // Currency + price formatting helpers
  const currencySymbol = (code: RestaurantMeta['currency'] | undefined) => {
    switch(code) {
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'MAD': return language === 'ar' ? 'درهم' : 'MAD'
      case 'TND': return language === 'ar' ? 'د.ت' : 'TND'
      case 'DZD': default: return language === 'ar' ? 'دج' : 'DZD'
    }
  }
  const formatPrice = (amount:number) => {
    const sym = currencySymbol(meta?.currency)
    if (sym === '$' || sym === '€') return `${sym}${amount}`
    return `${amount} ${sym}`
  }


  return (
    <div className={`min-h-screen bg-background ${language === 'ar' ? 'rtl' : 'ltr'}`}>
  {activeOrderId && (
        <div className="w-full bg-amber-100 text-amber-900 text-sm px-4 py-2 text-center flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{t.orderLocked}</span>
          <Button size="sm" variant="outline" onClick={() => setShowOrders(true)} className="ml-2">
            {t.view}
          </Button>
        </div>
      )}
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-border/60 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {meta?.logo_url ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={meta.logo_url} alt={meta.restaurant_name || 'Logo'} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-serif font-bold text-lg text-foreground truncate">
                  {meta?.restaurant_name || t.restaurantName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t.tableNumber} {tableId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Audio Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAudioNotifications(!audioNotifications)}
                className="rounded-full w-10 h-10 p-0 border-2 hover:scale-105 transition-all duration-200"
                title={audioNotifications ? t.disableSounds : t.enableSounds}
              >
                {audioNotifications ? "🔊" : "🔇"}
              </Button>

              {/* Language Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="rounded-full border-2 hover:scale-105 transition-all duration-200 px-3"
              >
                <Globe className="h-4 w-4 mr-1" />
                {language.toUpperCase()}
              </Button>

              {/* Orders Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrders(!showOrders)}
                className="relative rounded-full border-2 hover:scale-105 transition-all duration-200 px-3"
              >
                <Clock className="h-4 w-4" />
                {orders.filter((order) => order.status !== "served").length > 0 && (
                  <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                    {orders.filter((order) => order.status !== "served").length}
                  </div>
                )}
              </Button>

              {/* Cart Button */}
              <Button
                onClick={() => setShowCart(!showCart)}
                disabled={!!activeOrderId}
                className="relative bg-primary hover:bg-primary/90 text-white rounded-full w-12 h-12 p-0 shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50"
              >
                <ShoppingCart className="h-5 w-5" />
                {getTotalItems() > 0 && (
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-bounce">
                    {getTotalItems()}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Section – Medium size grid */}
      {!selectedCategory && (
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                {t.selectCategory}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {t.tapCategory}
              </p>
            </div>

            {/* Loading skeletons (grid) */}
            {loadingCats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_,i)=>(
                  <div key={i} className="rounded-xl bg-card border border-border/40 p-3 flex flex-col gap-3 animate-pulse">
                    <div className="aspect-[4/3] w-full bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!loadingCats && categories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => selectCategory(category.id)}
                    className="group relative rounded-xl border border-border/50 bg-card p-3 flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 hover:shadow-md transition-all"
                    style={{animationDelay: `${index * 40}ms`}}
                  >
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-3">
                      <Image
                        src={category.image_url || '/placeholder.svg'}
                        alt={category.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        priority={index < 4}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                    <h3 className="font-semibold text-sm md:text-base text-foreground line-clamp-1 mb-1">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-2 leading-snug">
                        {category.description}
                      </p>
                    )}
                    <span className="mt-auto pt-2 text-[11px] md:text-xs font-medium text-primary inline-flex items-center gap-1">
                      {t.open}
                      <span className={`inline-block transition-transform group-hover:translate-x-0.5 ${language === 'ar' ? 'rotate-180' : ''}`}>→</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!loadingCats && categories.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {t.noCategories}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modern Products Grid */}
      {selectedCategory && (
        <main className="min-h-screen bg-gradient-to-b from-background to-muted/10 py-6">
          <div className={`container mx-auto px-4 ${categoryTransition ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}>
            {/* Enhanced Breadcrumb Header */}
            <div className="mb-8">
              <Button
                variant="ghost" 
                onClick={() => setSelectedCategory(null)}
                className="mb-4 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <span className="text-lg">←</span>
                  </div>
                  <span>{t.backToCategories}</span>
                </div>
              </Button>
              
              <div className="text-center">
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {selectedCategoryData?.name}
                </h1>
                <div className="w-16 h-1 bg-primary rounded-full mx-auto"></div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {loadingProducts && (
                [...Array(8)].map((_,i)=>(
                  <div key={i} className="bg-card rounded-3xl overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-6 bg-muted rounded w-16" />
                        <div className="h-9 bg-muted rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))
              )}
              {!loadingProducts && filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={`group bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up border border-border/30`}
                  style={{animationDelay: `${index * 50}ms`}}
                >
                  {/* Product Image */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted/20">
                    <Image
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      width={300}
                      height={225}
                      priority={index < 6}
                    />
                    
                    {/* Price Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
                      <span className="text-sm font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    
                    {/* Availability Overlay */}
                    {product.available === false && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white/95 rounded-full px-4 py-2">
                          <span className="text-sm font-medium text-red-600">{t.unavailable}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Adding Animation */}
                    {addingToCart === product.id && (
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-primary text-white rounded-full p-4 animate-bounce">
                          <CheckCircle className="h-8 w-8" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="p-4">
                    <div className="mb-3">
                      <h3 className="font-serif font-bold text-lg text-foreground mb-1 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Add to Cart Button */}
                    <Button
                      onClick={() => addToCart({
                        id: product.id,
                        category_id: product.category_id,
                        name_ar: product.name,
                        name_fr: product.name,
                        description_ar: product.description || '',
                        description_fr: product.description || '',
                        price: product.price,
                        available: product.available,
                        image: product.image_url || '/placeholder.svg'
                      } as unknown as Product)}
                      disabled={product.available === false || addingToCart === product.id}
                      className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                    >
                      {addingToCart === product.id ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">{t.adding}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>{t.addToCart}</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Modern Order History Modal */}
      {showOrders && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-background w-full sm:max-w-md sm:mx-4 max-h-[85vh] sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold">{t.yourOrders}</h3>
                  <p className="text-white/80 text-sm mt-1">Track your order status</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOrders(false)}
                  className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-10 w-10 text-muted-foreground" />
                  </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">{t.noOrders}</h4>
                  <p className="text-sm text-muted-foreground">{t.startByAdding}</p>
                </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, index) => (
                    <div
                      key={order.id}
                      className={`bg-card rounded-2xl border p-4 transition-all duration-300 ${
                        lastOrderId === order.id ? "border-primary shadow-lg scale-[1.02]" : "border-border"
                      }`}
                      style={{animationDelay: `${index * 100}ms`}}
                    >
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">•</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{language==='ar' ? 'الطلب الحالي' : 'Current Order'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${getStatusColor(order.status)} border-0 px-3 py-1 rounded-full text-xs font-medium`}
                        >
                          <span className="mr-1">{getStatusIcon(order.status)}</span>
                          {t[order.status]}
                        </Badge>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                            style={{animationDelay: `${itemIndex * 50}ms`}}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                {item.quantity}×
                              </div>
                              <span className="text-sm text-foreground font-medium line-clamp-1">
                                {language === "ar" ? item.name_ar : item.name_fr}
                              </span>
                            </div>
                            <span className="text-sm text-primary font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div>
                          <p className="text-sm text-muted-foreground">{t.estimatedTime}</p>
                          <p className="font-medium text-foreground">
                            {getEstimatedTime(order.status, order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{t.total}</p>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(order.total_amount)}
                          </p>
                        </div>
                      </div>

                      {/* Ready Status Highlight */}
                      {order.status === "ready" && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                          <div className="text-green-600 text-sm font-medium">🎉 {t.ready}!</div>
                          <div className="text-green-700 text-xs mt-1">{t.orderReady}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modern Floating Cart */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-background w-full sm:max-w-md sm:mx-4 max-h-[90vh] sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold">{t.cart}</h3>
                    <p className="text-white/80 text-sm">{getTotalItems()} {t.itemsSelected}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                  className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-card rounded-2xl border border-border/50 p-4 transition-all duration-200 hover:shadow-md"
                    style={{animationDelay: `${index * 50}ms`}}
                  >
                    <div className="flex gap-4">
                      {/* Item Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={language === "ar" ? item.name_ar : item.name_fr}
                          className="w-full h-full object-cover"
                          width={64}
                          height={64}
                        />
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm line-clamp-1 mb-1">
                          {language === "ar" ? item.name_ar : item.name_fr}
                        </h4>
                        <p className="text-sm text-primary font-medium mb-3">
                          {formatPrice(item.price)} {t.each}
                        </p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 p-0 rounded-full border-2"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-semibold text-lg">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 p-0 rounded-full border-2"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Note */}
            <div className="px-6 pb-4">
              <div className="bg-muted/30 rounded-2xl p-4">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  <span className="flex items-center gap-2">
                    📝 {t.noteOptional}
                  </span>
                </label>
                <textarea
                  value={orderNote}
                  onChange={e=> setOrderNote(e.target.value.slice(0,300))}
                  placeholder={t.notePlaceholder}
                  className="w-full rounded-xl border-0 bg-background px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  maxLength={300}
                />
                <div className="text-xs text-muted-foreground mt-2 text-right">
                  {orderNote.length}/300
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-muted/10 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-foreground">{t.total}:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 text-lg font-semibold transition-all duration-200 hover:scale-[1.02] shadow-lg"
                onClick={submitOrder}
                disabled={isSubmittingOrder || orders.some(o => o.status !== 'served')}
              >
                {isSubmittingOrder ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t.submittingOrder}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5" />
                    <span>{t.orderNow}</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Empty State */}
      {!selectedCategory && !loadingCats && categories.length > 0 && (
        <div className="text-center py-16 px-4">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <ChefHat className="h-12 w-12 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-3">
              {t.welcomeTo} {meta?.restaurant_name || t.restaurantName}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t.discoverMenu}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
