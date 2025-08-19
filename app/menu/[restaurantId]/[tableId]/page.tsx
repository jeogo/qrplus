'use client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Globe, Plus, Minus, Trash2, Loader2, Clock, CheckCircle, Truck, Star, ChefHat } from 'lucide-react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import { OrderTracking } from '@/lib/order-tracking'
import { useSystemActive } from '@/hooks/use-system-active'
import { usePersistentOrder } from '@/hooks/use-persistent-order'

interface PublicCategory { id: number; name: string }
interface PublicProduct { id: number; name: string; description?: string; price: number; image_url?: string }
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
    enableSounds: 'تفعيل الأصوات'
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
    enableSounds: 'Activer les sons'
  }
} as const

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
  
  // UI state
  const [showCart, setShowCart] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [audioNotifications, setAudioNotifications] = useState(true)
  const [categoryTransition, setCategoryTransition] = useState(false)
  
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
      const savedCart = OrderTracking.loadCart(tableId) as CartItem[]
      setCart(savedCart || [])
      const savedOrderId = OrderTracking.load(tableId)
      if (savedOrderId) setActiveOrderId(savedOrderId)
    }
  }, [tableId])

  const playNotificationSoundRef = useRef(() => {
    if (audioNotifications && audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      } catch {}
    }
  })

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/meta`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) {
        setMeta(json.data)
        setLanguage(json.data.language || 'ar')
      }
    } catch {}
  }, [restaurantId, tableId])

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/categories`)
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) setCategories(json.data)
    } finally {
      setLoadingCats(false)
    }
  }, [restaurantId, tableId])

  const fetchProducts = useCallback(async (cid: number) => {
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/public/menu/${restaurantId}/${tableId}/products?category_id=${cid}`)
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) setProducts(json.data)
    } finally {
      setLoadingProducts(false)
    }
  }, [restaurantId, tableId])

  const selectCategory = useCallback((categoryId: number) => {
    setCategoryTransition(true)
    setSelectedCategory(categoryId)
    fetchProducts(categoryId)
    setTimeout(() => setCategoryTransition(false), 300)
  }, [fetchProducts])

  useEffect(() => { if (mounted) { fetchMeta(); fetchCategories() } }, [fetchMeta, fetchCategories, mounted])
  useEffect(() => { OrderTracking.saveCart(tableId, cart) }, [cart, tableId])

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

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const canOrder = !activeOrderId && cart.length > 0

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'accepted': return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'preparing': return <ChefHat className="w-4 h-4 text-orange-600" />
      case 'ready': return <Star className="w-4 h-4 text-green-600" />
      case 'served': return <Truck className="w-4 h-4 text-gray-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'served': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!systemActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {t.systemInactive}
          </h2>
          <p className="text-gray-600">{t.systemInactiveMessage}</p>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b z-50 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {meta?.logo_url && (
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 p-1">
                <Image src={meta.logo_url} alt="logo" width={48} height={48} className="rounded-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-800">{meta?.restaurant_name || `Restaurant ${restaurantId}`}</h1>
              <p className="text-sm text-gray-600">{t.table} {tableId}</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(l => l === 'ar' ? 'fr' : 'ar')}
              className="flex items-center gap-1 text-sm"
            >
              <Globe className="w-4 h-4" />
              {language.toUpperCase()}
            </Button>
            
            {/* Orders Button */}
            {activeOrderId && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 relative"
              >
                <ChefHat className="w-4 h-4" />
                {t.order}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              </Button>
            )}
            
            {/* Cart Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCart(!showCart)}
              className="flex items-center gap-1 relative"
              disabled={!cart.length}
            >
              <ShoppingCart className="w-4 h-4" />
              <Badge variant="secondary" className="ml-1">{cartCount}</Badge>
              {cart.length > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Active Order Status */}
        {activeOrderId && orders.length > 0 && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-5 h-5 text-orange-600" />
              <h2 className="font-semibold text-lg">{t.orderStatus}</h2>
            </div>
            
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="font-medium">{t.order} #{order.id}</p>
                    <p className="text-sm text-gray-600">{t[order.status]}</p>
                  </div>
                </div>
                <Badge className={`${getStatusColor(order.status)} px-3 py-1`}>
                  {t[order.status]}
                </Badge>
              </div>
            ))}
          </section>
        )}

        {/* Categories */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded"></div>
            </div>
            <h2 className="font-semibold text-lg">{t.categories}</h2>
          </div>
          
          {loadingCats ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              {t.loading}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectCategory(category.id)}
                  className={`transition-all duration-200 ${
                    selectedCategory === category.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          )}
        </section>

        {/* Products */}
        {selectedCategory && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-600" />
              <h2 className="font-semibold text-lg">{t.products}</h2>
            </div>
            
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                {t.loading}
              </div>
            ) : (
              <div className={`grid gap-6 transition-opacity duration-300 ${categoryTransition ? 'opacity-50' : 'opacity-100'} sm:grid-cols-2 lg:grid-cols-3`}>
                {products.map(product => (
                  <div key={product.id} className="group border rounded-xl p-4 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50">
                    {product.image_url && (
                      <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2 line-clamp-1 text-gray-800">{product.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px] mb-3">{product.description || ''}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-lg text-blue-600">{product.price} {t.dzd}</div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={addingToCart === product.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 hover:shadow-lg"
                      >
                        {addingToCart === product.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            {t.addToCart}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Cart */}
        {(showCart || cart.length > 0) && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-lg">{t.cart}</h2>
                <Badge variant="secondary">{cartCount}</Badge>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowCart(!showCart)}>
                  {showCart ? 'Hide' : 'Show'}
                </Button>
              )}
            </div>
            
            {!cart.length ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t.empty}</p>
              </div>
            ) : showCart ? (
              <>
                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      {item.image && (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image src={item.image} alt={item.name_ar} fill className="object-cover" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-1 text-gray-800">
                          {language === 'ar' ? item.name_ar : item.name_fr}
                        </h4>
                        <p className="text-sm text-gray-600">{item.price} {t.dzd}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => decrementCart(item.id)}
                          className="h-8 w-8"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => incrementCart(item.id)}
                          className="h-8 w-8"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Order Note */}
                <div className="mb-4">
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder={t.addNote}
                    className="w-full p-3 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>

                {/* Order Summary */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-lg font-bold text-gray-800">
                    {t.total}: <span className="text-blue-600">{cartTotal} {t.dzd}</span>
                  </div>
                  <Button
                    onClick={submitOrder}
                    disabled={submitting || !canOrder}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 shadow-md transition-all duration-200 hover:shadow-lg disabled:bg-gray-400"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.loading}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t.orderNow}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-800">{cartCount} items</p>
                  <p className="text-sm text-blue-600">{cartTotal} {t.dzd}</p>
                </div>
                <Button size="sm" onClick={() => setShowCart(true)} className="bg-blue-600 hover:bg-blue-700">
                  View Cart
                </Button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Settings Panel */}
      <div className="fixed bottom-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAudioNotifications(!audioNotifications)}
          className={`${audioNotifications ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50'}`}
        >
          🔊 {t.enableSounds}
        </Button>
      </div>
    </div>
  )
}
