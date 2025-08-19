'use client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ShoppingCart, Globe, Plus, Minus, Trash2, Loader2, Clock, CheckCircle, Truck, Star, ChefHat, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { OrderTracking } from '@/lib/order-tracking'
import { useSystemActive } from '@/hooks/use-system-active'
import { usePersistentOrder } from '@/hooks/use-persistent-order'

interface PublicCategory { 
  id: number; 
  name: string; 
  description?: string; 
  image_url?: string; 
}
interface PublicProduct { 
  id: number; 
  name: string; 
  description?: string; 
  price: number; 
  image_url?: string; 
  available?: boolean; 
}
interface CartItem { id: number; name_ar: string; name_fr: string; price: number; quantity: number; image: string }

interface Order {
  id: number
  table_id: string
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'served'
  total_amount: number
  created_at: string
  items: { product_id: number; quantity: number; price: number; product_name: string }[]
}

interface RestaurantMeta {
  id: number
  restaurant_name: string
  logo_url?: string
  language: 'ar' | 'fr'
  currency: string
  is_active: boolean
}

const translations = {
  ar: {
    cart: 'السلة',
    total: 'المجموع',
    orderNow: 'اطلب الآن',
    empty: 'فارغ',
    addToCart: 'إضافة للسلة',
    quantity: 'الكمية',
    remove: 'حذف',
    dzd: 'د.ج',
    categories: 'الفئات',
    products: 'المنتجات',
    loading: 'جاري التحميل...',
    table: 'طاولة',
    order: 'طلب',
    myOrders: 'طلباتي',
    orderStatus: 'حالة الطلب',
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    served: 'تم التقديم',
    orderNote: 'ملاحظة الطلب',
    addNote: 'إضافة ملاحظة',
    orderHistory: 'تاريخ الطلبات',
    noOrders: 'لا توجد طلبات',
    orderPlaced: 'تم تقديم الطلب',
    orderUpdated: 'تم تحديث الطلب',
    systemInactive: 'النظام غير نشط',
    systemInactiveMessage: 'النظام مغلق حالياً. يرجى المحاولة لاحقاً.',
    notifications: 'الإشعارات',
    enableSounds: 'تفعيل الأصوات',
    items: 'عناصر',
    viewProducts: 'عرض المنتجات',
    unavailable: 'غير متوفر',
    orderItems: 'عناصر الطلب',
    orderReady: 'طلبكم جاهز!',
    backToCategories: 'العودة للفئات',
    statusMessages: {
      pending: 'طلبكم قيد المراجعة',
      accepted: 'تم قبول الطلب وبدء التحضير',
      preparing: 'يتم تحضير طلبكم الآن',
      ready: 'طلبكم جاهز للاستلام',
      served: 'تم تقديم طلبكم. شهية طيبة'
    }
  },
  fr: {
    cart: 'Panier',
    total: 'Total',
    orderNow: 'Commander',
    empty: 'Vide',
    addToCart: 'Ajouter au panier',
    quantity: 'Quantité',
    remove: 'Supprimer',
    dzd: 'DA',
    categories: 'Catégories',
    products: 'Produits',
    loading: 'Chargement...',
    table: 'Table',
    order: 'Commande',
    myOrders: 'Mes commandes',
    orderStatus: 'Statut de la commande',
    pending: 'En attente',
    accepted: 'Acceptée',
    preparing: 'En préparation',
    ready: 'Prête',
    served: 'Servie',
    orderNote: 'Note de commande',
    addNote: 'Ajouter une note',
    orderHistory: 'Historique des commandes',
    noOrders: 'Aucune commande',
    orderPlaced: 'Commande passée',
    orderUpdated: 'Commande mise à jour',
    systemInactive: 'Système inactif',
    systemInactiveMessage: 'Le système est actuellement fermé. Veuillez réessayer plus tard.',
    notifications: 'Notifications',
    enableSounds: 'Activer les sons',
    items: 'articles',
    viewProducts: 'Voir les produits',
    unavailable: 'Indisponible',
    orderItems: 'Articles de commande',
    orderReady: 'Votre commande est prête!',
    backToCategories: 'Retour aux catégories',
    statusMessages: {
      pending: 'Votre commande est en cours de révision',
      accepted: 'Commande acceptée et préparation commencée',
      preparing: 'Votre commande est en cours de préparation',
      ready: 'Votre commande est prête à être récupérée',
      served: 'Votre commande a été servie. Bon appétit'
    }
  }
} as const

// Status progression reused across UI elements
const ORDER_STATUSES: Order['status'][] = ['pending', 'accepted', 'preparing', 'ready', 'served']

// CSS keyframes for animations
const keyframes = {
  fadeIn: '@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }',
  pulse: '@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }',
  shimmer: '@keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }'
}

// Enhanced atomic components for premium UI
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`relative overflow-hidden animate-pulse rounded-lg bg-gradient-to-r from-muted/30 via-muted/70 to-muted/30 ${className}`}>
    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
  </div>
)

interface CategoryCardProps { category: PublicCategory; onSelect: (id:number)=>void; index:number }
const CategoryCard = ({ category, onSelect, index }: CategoryCardProps) => (
  <button
    type="button"
    onClick={() => onSelect(category.id)}
    className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-md supports-[backdrop-filter]:bg-white/50 shadow-md hover:shadow-xl transition-all duration-300 ease-out hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring/40 animate-fadeIn"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <div className="relative h-28 w-full overflow-hidden">
      {category.image_url ? (
        <Image
          src={category.image_url}
          alt={category.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:640px)50vw,(max-width:1024px)33vw,25vw"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 via-muted/50 to-background">
          <Star className="h-7 w-7 text-muted-foreground/40" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
    </div>
    <div className="p-3">
      <h3 className="text-sm font-medium text-foreground line-clamp-1 text-center tracking-wide">{category.name}</h3>
    </div>
  </button>
)

interface ProductCardProps {
  product: PublicProduct;
  index:number;
  currency?: string;
  adding:boolean;
  inCartQty:number;
  onAdd:()=>void;
  onInc:()=>void;
  onDec:()=>void;
  disabled:boolean;
}
const ProductCard = ({ product, index, currency, adding, inCartQty, onAdd, onInc, onDec, disabled }: ProductCardProps) => (
  <div
    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-md supports-[backdrop-filter]:bg-white/50 shadow-md hover:shadow-xl transition-all duration-300 focus-within:ring-2 focus-within:ring-ring/40 animate-fadeIn"
    style={{ animationDelay: `${index * 40}ms` }}
  >
    <div className="relative h-40 w-full overflow-hidden">
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:640px)100vw,(max-width:1024px)50vw,33vw"
          priority={index < 2}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 via-muted/50 to-background">
          <Star className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      {product.available === false && (
        <div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 flex items-center justify-center">
          <span className="rounded-full bg-destructive/90 px-4 py-1.5 text-xs font-medium text-destructive-foreground tracking-wide shadow-md">{currency === 'د.ج' ? 'غير متوفر' : 'Unavailable'}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
    </div>
    <div className="flex flex-1 flex-col p-4 gap-3">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 tracking-tight">{product.name}</h3>
        {product.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{product.description}</p>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">{product.price} {currency}</span>
        {inCartQty > 0 ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onDec} aria-label="decrease" className="h-8 w-8 p-0 rounded-full border-border/60 hover:bg-background hover:text-foreground transition-colors"> 
              <Minus className="h-3 w-3" /> 
            </Button>
            <span className="text-sm font-medium w-6 text-center select-none tabular-nums">{inCartQty}</span>
            <Button size="sm" variant="outline" onClick={onInc} aria-label="increase" className="h-8 w-8 p-0 rounded-full border-border/60 hover:bg-background hover:text-foreground transition-colors"> 
              <Plus className="h-3 w-3" /> 
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={onAdd}
            disabled={adding || disabled}
            aria-label="add to cart"
            className="h-9 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 hover:shadow-md active:scale-95"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            <span className="text-xs">{currency === 'د.ج' ? 'إضافة' : 'Ajouter'}</span>
          </Button>
        )}
      </div>
    </div>
  </div>
)

const ErrorPanel = ({ message, onRetry }: { message: string; onRetry?: ()=>void }) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
    <div className="rounded-full bg-destructive/10 p-3">
      <Clock className="h-6 w-6 text-destructive" />
    </div>
    <p className="text-sm font-medium text-destructive">{message}</p>
    {onRetry && (
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onRetry}
        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Retry
      </Button>
    )}
  </div>
)

// Status icon component with animated transitions
const StatusIcon = ({ status }: { status: Order['status'] }) => {
  const icons = {
    'pending': <Clock className="w-5 h-5" />,
    'accepted': <CheckCircle className="w-5 h-5" />,
    'preparing': <ChefHat className="w-5 h-5" />,
    'ready': <Star className="w-5 h-5" />,
    'served': <Truck className="w-5 h-5" />
  }
  return icons[status] || <Clock className="w-5 h-5" />
}

export default function RestaurantTableMenuPage() {
  const { restaurantId, tableId } = useParams() as { restaurantId: string; tableId: string }
  const [language, setLanguage] = useState<'ar' | 'fr'>('ar')
  const [mounted, setMounted] = useState(false)
  const t = translations[language]
  
  // Data state
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [meta, setMeta] = useState<RestaurantMeta | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  
  // Loading states
  const [loadingCats, setLoadingCats] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addingToCart, setAddingToCart] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [errorMeta, setErrorMeta] = useState<string | null>(null)
  const [errorCats, setErrorCats] = useState<string | null>(null)
  const [errorProducts, setErrorProducts] = useState<string | null>(null)
  
  // UI state
  const [showCart, setShowCart] = useState(false)
  const [showOrderTracker, setShowOrderTracker] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [audioNotifications, setAudioNotifications] = useState(true)
  
  // System state
  const systemActive = useSystemActive(true)
  const persistent = usePersistentOrder(tableId)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sseControllerRef = useRef<AbortController | null>(null)

  // Initialize audio and cart on mount
  useEffect(() => {
    setMounted(true)
    try { 
      audioRef.current = new Audio('/notification.wav')
      audioRef.current.volume = 0.6
    } catch {}
    
    if (typeof window !== 'undefined') {
      // restore language preference
      const savedLang = localStorage.getItem('qr_menu_lang') as 'ar' | 'fr' | null
      if (savedLang && (savedLang === 'ar' || savedLang === 'fr')) setLanguage(savedLang)
      const savedCart = OrderTracking.loadCart(tableId) as CartItem[]
      setCart(savedCart || [])
      const savedOrderId = OrderTracking.load(tableId)
      if (savedOrderId) setActiveOrderId(savedOrderId)
    }
  }, [tableId])

  // persist language
  useEffect(() => {
    try { localStorage.setItem('qr_menu_lang', language) } catch {}
  }, [language])

  const playNotificationSoundRef = useRef(() => {
    if (audioNotifications && audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      } catch {}
    }
  })

  const fetchMeta = useCallback(async () => {
    setErrorMeta(null)
    try {
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/meta`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) {
        setMeta(json.data)
        setLanguage(json.data.language || 'ar')
      } else setErrorMeta('Failed to load meta')
    } catch { setErrorMeta('Network error') }
  }, [restaurantId, tableId])

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true); setErrorCats(null)
    try {
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/categories`)
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) {
        setCategories(json.data)
      } else {
        setErrorCats('Failed to load categories')
      }
    } finally { setLoadingCats(false) }
  }, [restaurantId, tableId])

  const fetchProducts = useCallback(async (cid: number) => {
    setLoadingProducts(true); setErrorProducts(null)
    try {
      // Add slight delay to make loading feel more natural
      await new Promise(r => setTimeout(r, 300))
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/products?category_id=${cid}`)
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) {
        setProducts(json.data)
      } else {
        setErrorProducts('Failed to load products')
      }
    } finally { setLoadingProducts(false) }
  }, [restaurantId, tableId])

  const selectCategory = useCallback((categoryId: number) => {
    setSelectedCategory(categoryId)
    fetchProducts(categoryId)
  }, [fetchProducts])

  useEffect(() => { if (mounted) { fetchMeta(); fetchCategories() } }, [fetchMeta, fetchCategories, mounted])
  useEffect(() => { OrderTracking.saveCart(tableId, cart) }, [cart, tableId])

  // fetch full order details if tracker opened & items missing
  const fetchOrderDetails = useCallback(async (orderId: number) => {
    try {
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/orders/${orderId}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...json.data } : o))
      }
    } catch {}
  }, [restaurantId, tableId])

  useEffect(() => {
    if (showOrderTracker && activeOrderId) {
      const target = orders.find(o => o.id === activeOrderId)
      if (target && (!target.items || target.items.length === 0)) {
        fetchOrderDetails(activeOrderId)
      }
    }
  }, [showOrderTracker, activeOrderId, orders, fetchOrderDetails])

  // Real-time order status tracking via SSE
  useEffect(() => {
    if (!activeOrderId || !mounted) return
    
    const connectSSE = async () => {
      try {
        const { connectPublicOrderStatus } = await import('@/lib/public-order-sse')
        sseControllerRef.current = new AbortController()
        
        connectPublicOrderStatus({
          orderId: activeOrderId,
          onStatus: (data) => {
            setOrders(prev => {
              const existing = prev.find(o => o.id === data.id)
              if (existing) {
                if (existing.status !== data.status) {
                  console.log('[PUBLIC][SSE] Status change', existing.status, '→', data.status)
                  if (data.status === 'ready' || data.status === 'served') {
                    playNotificationSoundRef.current()
                  }
                  if (data.status === 'served') {
                    OrderTracking.clear(tableId)
                    setActiveOrderId(null)
                  }
                  persistent.updateStatus(data.status)
                }
                return prev.map(o => o.id === data.id ? { ...o, status: data.status as Order['status'] } : o)
              }
              return [{ 
                id: data.id, 
                table_id: String(data.table_id), 
                status: data.status as Order['status'], 
                total_amount: 0, 
                created_at: new Date().toISOString(), 
                items: [] 
              }]
            })
          },
          onDeleted: () => {
            setActiveOrderId(null)
            persistent.clear()
            setOrders([])
            OrderTracking.clear(tableId)
            playNotificationSoundRef.current()
          },
          onRetry: (attempt, delay) => {
            console.warn('[PUBLIC][SSE] retry', attempt, 'in', delay, 'ms')
          },
          onFinalError: () => {
            console.error('[PUBLIC][SSE] giving up after max retries')
          }
        })
      } catch (error) {
        console.error('[PUBLIC][SSE] Failed to connect:', error)
      }
    }

    connectSSE()
    return () => { 
      if (sseControllerRef.current) { 
        sseControllerRef.current.abort()
        sseControllerRef.current = null 
      } 
    }
  }, [activeOrderId, tableId, persistent, mounted])

  const addToCart = useCallback((product: PublicProduct, quantity = 1) => {
    setAddingToCart(product.id)
    try {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id)
        if (existing) {
          return prev.map(item => item.id === product.id ? 
            { ...item, quantity: item.quantity + quantity } : item)
        }
        return [...prev, { 
          id: product.id,
          name_ar: product.name,
          name_fr: product.name,
          price: product.price,
          quantity,
          image: product.image_url || ''
        }]
      })
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        } catch {}
      }
    } finally {
      setTimeout(() => setAddingToCart(null), 500)
    }
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }, [])

  const incrementCart = useCallback((productId: number) => {
    setCart(prev => prev.map(item => item.id === productId ? 
      { ...item, quantity: item.quantity + 1 } : item))
  }, [])

  const decrementCart = useCallback((productId: number) => {
    setCart(prev => prev.flatMap(item => {
      if (item.id === productId) {
        return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []
      }
      return [item]
    }))
  }, [])

  const submitOrder = useCallback(async () => {
    if (!cart.length || submitting) return
    setSubmitting(true)
    try {
      const payload = { 
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })), 
        note: orderNote 
      }
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const json = await res.json().catch(() => ({ success: false }))
      
      if (json.success) {
        const order = json.data.order || json.data
        const orderId = order.id
        OrderTracking.save(tableId, orderId)
        persistent.setInitial({ id: orderId, status: 'pending', created_at: new Date().toISOString(), items: [] })
        setActiveOrderId(orderId)
        setCart([])
        setOrderNote('')
        setShowCart(false)
        if (audioRef.current) {
          try {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
          } catch {}
        }
      }
    } finally {
      setSubmitting(false)
    }
  }, [cart, submitting, restaurantId, tableId, orderNote, persistent])

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const canOrder = !activeOrderId && cart.length > 0

  if (!systemActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t.systemInactive}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.systemInactiveMessage}</p>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-border border-t-transparent animate-spin" aria-label="loading" />
          <p className="text-xs text-muted-foreground tracking-wide uppercase">Loading</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        .shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-fadeIn {
          opacity: 0;
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes statusPulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .animate-statusPulse {
          animation: statusPulse 2s ease-in-out infinite;
        }
      `}</style>
    
      <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-gradient-to-b from-background via-background to-background`}>        
        {/* Enhanced Header with deeper blur */}
        <header className="sticky top-0 z-50 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 bg-background/80 border-b border-border/40 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {meta?.logo_url ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm">
                  <Image src={meta.logo_url} alt="logo" fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-muted shadow-sm">
                  <Star className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
              <div>
                <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{meta?.restaurant_name || `Restaurant ${restaurantId}`}</h1>
                <p className="text-xs text-muted-foreground">{t.table} {tableId}</p>
              </div>
            </div>
              
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLanguage(l => l === 'ar' ? 'fr' : 'ar')} 
                aria-label="toggle language" 
                className="rounded-full h-10 w-10 hover:bg-background/80"
              >
                <Globe className="w-5 h-5" />
              </Button>
                
              {activeOrderId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowOrderTracker(true)} 
                  className="relative h-10 w-10 rounded-full hover:bg-background/80" 
                  aria-label="order tracker"
                >
                  <ChefHat className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-foreground animate-statusPulse"></span>
                </Button>
              )}
                
              {cart.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowCart(true)} 
                  className="relative h-10 w-10 rounded-full hover:bg-background/80" 
                  aria-label="open cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                    {cartCount}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl p-4 pb-32 animate-fadeIn" style={{ animationDelay: '150ms' }}>
          {/* Categories - Enhanced Cards */}
          {!selectedCategory && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{t.categories}</h2>
                <div className="text-xs text-muted-foreground">{categories.length} {t.categories}</div>
              </div>
              {errorCats && <ErrorPanel message={errorCats} onRetry={fetchCategories} />}
              {!errorCats && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {loadingCats && !categories.length && [...Array(8)].map((_,i)=>(
                    <div key={i} className="overflow-hidden rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-0">
                      <Skeleton className="h-28 w-full rounded-none" />
                      <Skeleton className="mx-auto my-3 h-4 w-24" />
                    </div>
                  ))}
                  {!loadingCats && categories.map((c,i)=>(
                    <CategoryCard key={c.id} category={c} onSelect={selectCategory} index={i} />
                  ))}
                </div>
              )}
              {!loadingCats && !errorCats && categories.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-md p-8 text-center">
                  <Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No categories found.</p>
                </div>
              )}
            </div>
          )}

          {/* Products - Enhanced Cards */}
          {selectedCategory && (
            <div className="mb-10 space-y-4 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {setSelectedCategory(null); setProducts([])}}
                  className="flex items-center gap-2 rounded-xl hover:bg-background/80"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToCategories}
                </Button>
                <h2 className="text-lg font-semibold tracking-tight">{t.products}</h2>
              </div>
              
              {/* Enhanced Product search */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'بحث...' : 'Rechercher...'}
                    className="w-full rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow pl-10"
                    aria-label="search products"
                  />
                  <div className="absolute left-3 top-3 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/70">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.3-4.3"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {errorProducts && <ErrorPanel message={errorProducts} onRetry={() => selectedCategory && fetchProducts(selectedCategory)} />}
              {!errorProducts && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {loadingProducts && !products.length && [...Array(6)].map((_,i)=>(
                    <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4">
                      <Skeleton className="h-40 w-full rounded-xl mb-3" />
                      <div className="mt-3 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <div className="flex justify-between items-center pt-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 w-20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loadingProducts && products
                    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((p,i) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        index={i}
                        currency={meta?.currency || t.dzd}
                        adding={addingToCart === p.id}
                        inCartQty={cart.find(c => c.id === p.id)?.quantity || 0}
                        onAdd={() => addToCart(p)}
                        onInc={() => incrementCart(p.id)}
                        onDec={() => decrementCart(p.id)}
                        disabled={p.available === false}
                      />
                  ))}
                </div>
              )}
              {!loadingProducts && !errorProducts && products.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-md p-8 text-center">
                  <Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No products found for this category.</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Enhanced Order Tracker Dialog */}
        <Dialog open={showOrderTracker} onOpenChange={setShowOrderTracker}>
          <DialogContent className="max-w-md border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 rounded-xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                {t.orderStatus}
              </DialogTitle>
            </DialogHeader>
            
            {orders.length > 0 && (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order.id} className="space-y-4">
                    {/* Premium Status Timeline */}
                    <div className="flex items-center justify-center py-3">
                      <div className="flex items-center">
                        {ORDER_STATUSES.filter(s => s !== 'served').map((status, index) => {
                          const isActive = order.status === status;
                          const isPassed = ORDER_STATUSES.indexOf(order.status) > index;
                          
                          return (
                            <div key={status} className="flex items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs transition-all ${
                                isActive
                                  ? 'bg-foreground text-background shadow-md'
                                  : isPassed
                                  ? 'bg-foreground/80 text-background'
                                  : 'bg-muted text-muted-foreground'
                              } ${isActive ? 'animate-statusPulse' : ''}`}>
                                <StatusIcon status={status} />
                              </div>
                              {index < ORDER_STATUSES.filter(s => s !== 'served').length - 1 && (
                                <div className={`w-5 h-0.5 mx-1 ${
                                  isPassed
                                    ? 'bg-foreground/80'
                                    : 'bg-muted'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Enhanced Current Status */}
                    <div className="text-center p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/60">
                      <h3 className="font-semibold text-foreground mb-1">{t[order.status]}</h3>
                      <p className="text-muted-foreground text-sm">{(t.statusMessages as Record<Order['status'], string>)[order.status] || t[order.status]}</p>
                    </div>
                    
                    {/* Enhanced Order Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground text-sm tracking-tight">{t.orderItems}</h4>
                        {order.items.map((item) => (
                          <div key={item.product_id} className="flex justify-between text-sm p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                            <span>{item.product_name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                            <span className="font-medium tabular-nums">{(item.price * item.quantity).toFixed(2)} {meta?.currency}</span>
                          </div>
                        ))}
                        
                        <div className="border-t border-border/60 pt-3 mt-3">
                          <div className="flex justify-between font-semibold">
                            <span>{t.total}:</span>
                            <span className="tabular-nums text-lg">{order.total_amount} {meta?.currency}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Enhanced Cart Dialog */}
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 rounded-xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {t.cart} ({cartCount} {t.items})
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col max-h-[60vh] overflow-hidden">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full bg-background/80 animate-ping opacity-75"></div>
                    <div className="relative flex items-center justify-center w-16 h-16 bg-background rounded-full border border-border/60">
                      <ShoppingCart className="w-8 h-8 text-muted-foreground/70" />
                    </div>
                  </div>
                  <p>{t.empty}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 flex-1 overflow-y-auto mb-4">
                    {cart.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 border border-border/60 rounded-xl bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200 animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {item.image && (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/40">
                            <Image src={item.image} alt={item.name_ar} fill className="object-cover" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {language === 'ar' ? item.name_ar : item.name_fr}
                          </h4>
                          <p className="text-xs text-muted-foreground tabular-nums">{item.price} {meta?.currency || t.dzd}</p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decrementCart(item.id)}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => incrementCart(item.id)}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Order Note */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium text-foreground/90 mb-1 block">{t.orderNote}</Label>
                    <Textarea
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder={t.addNote}
                      className="w-full text-sm resize-none border-border/60 rounded-lg bg-background/80"
                      rows={2}
                    />
                  </div>

                  {/* Enhanced Order Summary */}
                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{t.total}:</span>
                      <span className="font-bold text-lg text-foreground tabular-nums">{cartTotal} {meta?.currency || t.dzd}</span>
                    </div>
                    
                    <Button
                      onClick={submitOrder}
                      disabled={submitting || !canOrder}
                      className="w-full bg-foreground hover:bg-foreground/90 text-background h-11 rounded-xl"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t.loading}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {t.orderNow}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          {activeOrderId && (
            <Button 
              onClick={() => setShowOrderTracker(true)} 
              className="rounded-full w-14 h-14 p-0 shadow-lg relative bg-foreground text-background hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200" 
              aria-label="order tracker"
            >
              <ChefHat className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-foreground animate-pulse"></div>
            </Button>
          )}
          
          {cart.length > 0 && (
            <Button 
              onClick={() => setShowCart(true)} 
              className="rounded-full w-14 h-14 p-0 shadow-lg relative bg-foreground text-background hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200" 
              aria-label="open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
                {cartCount}
              </span>
            </Button>
          )}
        </div>

        {/* Enhanced Settings Button */}
        <div className="fixed bottom-6 left-6 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAudioNotifications(!audioNotifications)}
            className={`rounded-full h-10 w-10 p-0 flex items-center justify-center backdrop-blur border-border/60 shadow-sm hover:shadow-md transition-all ${audioNotifications ? 'bg-white/70 dark:bg-white/10' : 'bg-background/80'}`}
          >
            {audioNotifications ? '🔊' : '🔇'}
          </Button>
        </div>

        {/* ARIA live region for status updates */}
        <div aria-live="polite" className="sr-only">
          {orders.map(o => `${t.order} ${o.id} ${t[o.status]}`).join('. ')}
        </div>
      </div>
    </>
  )
}
