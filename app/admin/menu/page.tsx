"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// removed Select for auto category assignment
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Loader2, RefreshCw, Image as ImageIcon } from "lucide-react"
import { notify } from '@/lib/notifications/facade'
import { formatCurrencyLocalized } from '@/lib/utils'
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminMenuTexts } from "@/lib/i18n/admin-menu"
import { CategoryCard } from './components/category-card'
import { ProductCard } from './components/product-card'
import { SkeletonCard } from './components/skeleton-card'
import type { Category as CategoryType, Product as ProductType } from './components/types'

type Category = CategoryType
type Product = ProductType

export default function MenuAdminPage() {
  const language = useAdminLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Category | Product | null>(null)
  const [isProductMode, setIsProductMode] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // removed unused 'error' state (lint cleanup)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

  const L = useMemo(() => getAdminMenuTexts(language), [language])
  const handleLanguageToggle = useCallback(() => {
    const next = language === 'ar' ? 'fr' : language === 'fr' ? 'en' : 'ar'
    try {
      localStorage.setItem('admin-language', next)
      localStorage.setItem('language', next)
    } catch {}
    window.dispatchEvent(new CustomEvent('languageChange', { detail: next }))
  }, [language])

  // Restaurant settings (currency, name, language)
  interface MinimalSettings { currency: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD'; restaurant_name: string; language: 'ar' | 'fr' | 'en' }
  const [settings, setSettings] = useState<MinimalSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true) // used for potential future UI; keep but reference to avoid unused warning
  void settingsLoading

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' })
        if (!res.ok) throw new Error('settings fetch failed')
        const json = await res.json()
        if (json.success && json.data) {
          const data = json.data as MinimalSettings
          if (!cancelled) setSettings({ currency: data.currency || 'DZD', restaurant_name: data.restaurant_name || '', language: data.language || 'ar' })
          // Initialize admin language from settings if user hasn't chosen yet
          const stored = localStorage.getItem('admin-language') as 'ar' | 'fr' | 'en' | null
            || undefined
          if (!stored && data.language) {
            localStorage.setItem('admin-language', data.language)
            window.dispatchEvent(new CustomEvent('languageChange', { detail: data.language }))
          }
        }
      } catch (e) {
        console.warn('Admin menu: settings load failed', e)
      } finally {
        if (!cancelled) setSettingsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const currency = settings?.currency || 'DZD'
  const formatPrice = useCallback((value:number)=> formatCurrencyLocalized(value, currency, language, { minimumFractionDigits: 2 }), [language, currency])

  const refreshCategories = useCallback(async (q?: string) => {
  // reset category load error (removed state)
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      qp.set('limit','100')
      if (q) qp.set('q', q)
      const data = await api<{ success: boolean; data: Category[] }>(`/api/categories?${qp.toString()}`)
      setCategories(data as unknown as Category[])
  } catch (e) {
  console.error('categories load failed', e)
  notify({ type:'menu.categories.load.error' })
    } finally { setLoading(false) }
  }, []) // language excluded: data set not language-dependent (server returns all in neutral form)

  // declare debouncedSearch earlier (placeholder, will assign after hook defined)
  useEffect(() => {
    setMounted(true)
    void refreshCategories()
  }, [refreshCategories])

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
    if (!res.ok) throw new Error(await res.text())
    return res.json().then(r => (r.data ?? r))
  }

  // refreshCategories defined above with useCallback

  const refreshProducts = useCallback(async (categoryId?: number, q?: string) => {
    if (!categoryId) return
    setLoadingProducts(true)
    try {
      const qp = new URLSearchParams()
      qp.set('category_id', String(categoryId))
      qp.set('limit','200')
      if (q) qp.set('q', q)
      const data = await api<{ success: boolean; data: Product[] }>(`/api/products?${qp.toString()}`)
      setProducts(data as unknown as Product[])
    } catch (e) {
  console.error('products load failed', e)
  notify({ type:'menu.products.load.error' })
    } finally { setLoadingProducts(false) }
  }, []) // language excluded: product fetching not language-dependent

  function useDebounce<T>(value: T, delay = 320) {
    const [d, setD] = useState(value)
    useEffect(()=> { const id = setTimeout(()=> setD(value), delay); return ()=> clearTimeout(id) }, [value, delay])
    return d
  }
  const debouncedSearch = useDebounce(searchTerm.trim())

  // remote search effects (after debouncedSearch defined)
  useEffect(()=> { if (!mounted) return; void refreshCategories(debouncedSearch || undefined) }, [debouncedSearch, mounted, refreshCategories])
  useEffect(()=> { if (!mounted || !selectedCategory) return; void refreshProducts(selectedCategory, debouncedSearch || undefined) }, [debouncedSearch, selectedCategory, mounted, refreshProducts])

  const performSave = async (formData: FormData) => {
    setSaving(true)
    try {
      // helper to upload file if we have a new one (category & product share logic)
      async function ensureImageUrl(baseName: string, required: boolean): Promise<string | undefined> {
        const existing = (formData.get(baseName) as string) || ''
        const file = formData.get(`${baseName}_file`) as File | null
        if (existing) return existing
  if (!file || file.size === 0) {
          if (required) throw new Error('Image required')
          return undefined
        }
        // Upload
        const sigRes = await fetch('/api/uploads/sign?folder=menu')
        if (!sigRes.ok) throw new Error('Sign failed')
        const { data } = await sigRes.json()
        const uploadForm = new FormData()
        uploadForm.append('file', file)
        uploadForm.append('api_key', data.apiKey)
        uploadForm.append('timestamp', String(data.timestamp))
        if (data.folder) uploadForm.append('folder', data.folder)
        uploadForm.append('signature', data.signature)
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`, { method: 'POST', body: uploadForm })
        const uploadJson = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadJson.error?.message || 'Upload failed')
        return uploadJson.secure_url as string
      }

      if (isProductMode) {
        const image_url = await ensureImageUrl('image_url', false)
        const payload = {
          category_id: selectedCategory || Number(formData.get('category_id')),
          name: String(formData.get('name')),
          description: (formData.get('description') as string) || undefined,
          price: Number(formData.get('price')),
          image_url,
          available: formData.get('available') === 'on',
        }
        if (editingItem && 'price' in editingItem) {
          const prev = [...products]
          setProducts(products.map(p => p.id === editingItem.id ? { ...p, ...payload } : p))
          const res = await fetch(`/api/products/${editingItem.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
          if (!res.ok) { setProducts(prev); throw new Error('Update failed') }
          const json = await res.json(); setProducts(products.map(p => p.id === editingItem.id ? json.data : p))
        } else {
          const tempId = Date.now()
          const optimistic = { id: tempId, account_id: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), category_id: payload.category_id, available: payload.available, price: payload.price, name: payload.name, description: payload.description, image_url: payload.image_url } as Product
          setProducts([...products, optimistic])
          const res = await fetch('/api/products', { method: 'POST', body: JSON.stringify(payload) })
          if (!res.ok) { setProducts(products.filter(p=>p.id!==tempId)); throw new Error('Create failed') }
          const json = await res.json(); setProducts(prev=> prev.map(p=> p.id===tempId ? json.data : p))
        }
      } else {
        const image_url = await ensureImageUrl('image_url', true)
        const payload = {
          name: String(formData.get('name')),
          description: (formData.get('description') as string) || undefined,
          active: formData.get('active') === 'on',
          image_url: image_url || ''
        }
        if (!payload.image_url) throw new Error('Image required')
        if (editingItem && 'active' in editingItem) {
          const prev = [...categories]
            setCategories(categories.map(c => c.id === editingItem.id ? { ...c, ...payload } : c))
          const res = await fetch(`/api/categories/${editingItem.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
          if (!res.ok) { setCategories(prev); throw new Error('Update failed') }
          const json = await res.json(); setCategories(categories.map(c => c.id === editingItem.id ? json.data : c))
        } else {
          const tempId = Date.now()
          const optimistic = { id: tempId, account_id:0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: payload.name, description: payload.description, active: payload.active, image_url: payload.image_url } as Category
          setCategories([...categories, optimistic])
          const res = await fetch('/api/categories', { method: 'POST', body: JSON.stringify(payload) })
          if (!res.ok) { setCategories(categories.filter(c=>c.id!==tempId)); throw new Error('Create failed') }
          const json = await res.json(); setCategories(prev=> prev.map(c=> c.id===tempId ? json.data : c))
        }
      }
      setIsDialogOpen(false)
      setEditingItem(null)
      if (selectedCategory) void refreshProducts(selectedCategory)
  notify({ type:'menu.save.success' })
    } catch (error) {
      console.error('Error saving:', error)
  notify({ type:'menu.save.error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (formData: FormData) => {
    if (saving) return
    setPendingFormData(formData)
    setConfirmSaveOpen(true)
  }

  const handleDelete = async (id: number, isProduct: boolean) => {
    if (deletingId) return // Prevent multiple clicks
    setDeletingId(id)
    try {
      const url = isProduct ? `/api/products/${id}` : `/api/categories/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      if (isProduct) {
        setProducts(products.filter(p => p.id !== id))
      } else {
        setCategories(categories.filter(c => c.id !== id))
        setProducts(products.filter(p => p.category_id !== id))
        if (selectedCategory === id) setSelectedCategory(null)
      }
  notify({ type:'menu.delete.success' })
    } catch (error) {
      console.error('Error deleting:', error)
  notify({ type:'menu.delete.error' })
    } finally {
      setDeletingId(null)
    }
  }

  if (!mounted || loading) {
    return (
      <AdminLayout>
        <AdminHeader title={L.title} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-6 text-blue-600" />
            <p className="text-slate-500 text-lg font-medium">{L.loading}</p>
          </div>
        </main>
      </AdminLayout>
    )
  }

  const s = searchTerm.toLowerCase()
  const filteredCategories = categories.filter((cat) => {
    if (s && !cat.name.toLowerCase().includes(s)) return false
    return true
  })

  const filteredProducts = products.filter((prod) => {
    if (s && !prod.name.toLowerCase().includes(s)) return false
    return !selectedCategory || prod.category_id === selectedCategory
  })

  // ... existing code for handlers ...

  return (
    <AdminLayout>
      <AdminHeader title={L.title} showBackButton={!!selectedCategory} onBackClick={()=>setSelectedCategory(null)} backText={L.back} />
      <main className={`min-h-screen bg-slate-50 ${language==='ar'?'rtl':'ltr'}`}>
        <div className="px-4 py-6 pb-24 max-w-6xl mx-auto space-y-8">
          {/* Modern Header Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Search Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder={L.searchPlaceholder} 
                  value={searchTerm} 
                  onChange={e=>setSearchTerm(e.target.value)} 
                  className="pl-12 h-12 text-base rounded-2xl border-slate-200 focus:border-blue-400 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all" 
                  aria-label="search"
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLanguageToggle}
                  className="h-12 px-4 rounded-2xl border-slate-200 hover:bg-slate-50 flex items-center gap-2"
                  aria-label="toggle language"
                >
                  {language === 'ar' ? 'FR' : language === 'fr' ? 'EN' : 'AR'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={()=>{ if (refreshing) return; setRefreshing(true); setSearchTerm(''); Promise.all([refreshCategories(), selectedCategory? refreshProducts(selectedCategory):Promise.resolve()]).finally(()=>{ setRefreshing(false); notify({ type:'menu.refresh.success' }) }) }} 
                  disabled={refreshing} 
                  className="flex-1 sm:flex-none h-12 px-6 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${refreshing?'animate-spin':''}`} />
                  {L.refresh}
                </Button>
                {!selectedCategory ? (
                  <Button 
                    onClick={()=>{ setEditingItem(null); setIsProductMode(false); setIsDialogOpen(true) }} 
                    className="flex-1 sm:flex-none h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {L.addCategory}
                  </Button>
                ) : (
                  <Button 
                    onClick={()=>{ setEditingItem(null); setIsProductMode(true); setIsDialogOpen(true) }} 
                    className="flex-1 sm:flex-none h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {L.addProduct}
                  </Button>
                )}
              </div>
            </div>

            {/* Title & Info Section */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
              {!selectedCategory && (
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  {L.categories}
                </h1>
              )}
              {selectedCategory && (
                <h1 className="text-2xl font-bold text-slate-900">
                  {L.productOf} {categories.find(c=>c.id===selectedCategory)?.name}
                </h1>
              )}
              <div className="flex flex-col items-end gap-1">
                <div className="text-sm text-slate-500 font-medium">{L.currencyNote}: {currency}</div>
                {settings?.restaurant_name && !selectedCategory && (
                  <div className="text-xs text-slate-400 max-w-[200px] truncate">{settings.restaurant_name}</div>
                )}
              </div>
            </div>
          </div>
          {/* Content Grid */}
          {!selectedCategory && (
            <div>
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({length: 8}).map((_,i)=>(<SkeletonCard key={i} variant="category" />))}
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-slate-500 text-lg mb-6">{L.noCategories}</p>
                  <Button onClick={()=>{ setEditingItem(null); setIsProductMode(false); setIsDialogOpen(true) }} className="h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg text-white">
                    <Plus className="h-5 w-5 mr-2" /> {L.addCategory}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCategories.map((category)=>(
                    <CategoryCard
                      key={category.id}
                      category={category}
                      productCount={products.filter(p=>p.category_id===category.id).length}
                      deleting={deletingId===category.id}
                      texts={{ active: L.active, inactive: L.inactive, products: L.products, deleteConfirmTitle: L.deleteConfirmTitle, deleteConfirmDescription: L.deleteConfirmDescription, confirm: L.confirm, cancel: L.cancel, editLabel: L.edit, deleteLabel: L.delete }}
                      onEdit={(c)=> { setEditingItem(c); setIsProductMode(false); setIsDialogOpen(true) }}
                      onDelete={(id)=> handleDelete(id,false)}
                      onSelect={(id)=> { setSelectedCategory(id); setProducts([]); void refreshProducts(id, debouncedSearch || undefined) }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {selectedCategory && (
            <div>
              {loadingProducts ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({length: 8}).map((_,i)=>(<SkeletonCard key={i} variant="product" />))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-slate-500 text-lg mb-6">{L.noProducts}</p>
                  <Button onClick={()=>{ setEditingItem(null); setIsProductMode(true); setIsDialogOpen(true) }} className="h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg text-white">
                    <Plus className="h-5 w-5 mr-2" /> {L.addProduct}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product)=>(
                    <ProductCard
                      key={product.id}
                      product={product}
                      deleting={deletingId===product.id}
                      onEdit={(p)=> { setEditingItem(p); setIsProductMode(true); setIsDialogOpen(true) }}
                      onDelete={(id)=> handleDelete(id,true)}
                      formatPrice={formatPrice}
                      texts={{ available: L.available, unavailable: L.unavailable, deleteConfirmTitle: L.deleteConfirmTitle, deleteConfirmDescription: L.deleteConfirmDescription, confirm: L.confirm, cancel: L.cancel, editLabel: L.edit, deleteLabel: L.delete }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Modern Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => !saving && setIsDialogOpen(open)}>
          <DialogContent className="w-[95vw] sm:w-auto sm:max-w-[560px] max-h-[88vh] overflow-y-auto rounded-3xl border-0 shadow-2xl p-0">
            <form action={handleSave} className="space-y-6">
              <DialogHeader className="space-y-3 pb-6 border-b border-slate-100 px-6 pt-6">
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  {editingItem 
                    ? (isProductMode ? L.editProductTitle : L.editCategoryTitle)
                    : (isProductMode ? L.addProductTitle : L.addCategoryTitle)}
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600">
                  {editingItem ? L.editDialogDescription : L.createDialogDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 px-6 pb-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700">{L.name}</Label>
                  <Input
                    id="name"
                    name="name"
                    disabled={saving}
                    defaultValue={editingItem ? ("name" in editingItem ? editingItem.name : "") : ""}
                    required
                    className="h-12 text-base rounded-2xl border-slate-200 focus:border-blue-400 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-slate-700">{L.description}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    disabled={saving}
                    defaultValue={editingItem ? ("description" in editingItem ? editingItem.description || "" : "") : ""}
                    className="min-h-[100px] text-base rounded-2xl border-slate-200 focus:border-blue-400 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all resize-none"
                  />
                </div>

                {isProductMode && (
                  <>
                    <input type="hidden" name="category_id" value={selectedCategory ?? ''} />
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="text-sm font-medium text-blue-900" dir="auto">
                        {L.categoryLabel}: {categories.find(c=>c.id===selectedCategory)?.name}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="price" className="text-sm font-semibold text-slate-700">{L.price}</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        disabled={saving}
                        defaultValue={editingItem ? (editingItem as Product).price : ""}
                        required
                        className="h-12 text-base rounded-2xl border-slate-200 focus:border-blue-400 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">{L.imageUrl}</Label>
                      <ImageUploader 
                        name="image_url" 
                        saving={saving} 
                        initialUrl={editingItem && 'image_url' in editingItem ? (editingItem as Product).image_url : undefined} 
                        required={false} 
                      />
                    </div>
                  </>
                )}

                {!isProductMode && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">{L.imageUrl}</Label>
                    <ImageUploader 
                      name="image_url" 
                      saving={saving} 
                      required 
                      initialUrl={editingItem && 'image_url' in editingItem ? (editingItem as Category).image_url : undefined} 
                    />
                  </div>
                )}

                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
                  <Switch
                    id={isProductMode ? "available" : "active"}
                    name={isProductMode ? "available" : "active"}
                    disabled={saving}
                    defaultChecked={
                      editingItem
                        ? isProductMode
                          ? (editingItem as Product).available
                          : (editingItem as Category).active
                        : true
                    }
                  />
                  <Label htmlFor={isProductMode ? "available" : "active"} className="text-sm font-medium text-slate-700">
                    {isProductMode ? L.available : L.active}
                  </Label>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t border-slate-100">
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 sm:flex-none h-12 px-6 rounded-2xl border-slate-200 hover:bg-slate-50"
                  >
                    {L.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving} 
                    className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {L.saving}
                      </>
                    ) : (
                      L.save
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* Save Confirmation */}
        <Dialog open={confirmSaveOpen} onOpenChange={(open: boolean)=> { if (!saving) setConfirmSaveOpen(open); if(!open) setPendingFormData(null) }}>
          <DialogContent className="w-[90vw] sm:w-auto sm:max-w-[440px] rounded-2xl border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle>{L.confirmSaveTitle}</DialogTitle>
              <DialogDescription>{L.confirmSaveDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3 sm:gap-2">
              <Button variant="outline" disabled={saving} onClick={()=> { setConfirmSaveOpen(false); setPendingFormData(null) }} className="h-11 px-6 rounded-xl border-slate-200">{L.cancel}</Button>
              <Button disabled={saving} onClick={()=> { if(pendingFormData) { setConfirmSaveOpen(false); void performSave(pendingFormData) } }} className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {L.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AdminLayout>
  )
}

interface ImageUploaderProps { name: string; required?: boolean; initialUrl?: string; saving?: boolean; readyLabel?: string; pendingLabel?: string }
function ImageUploader({ name, required, initialUrl, saving, readyLabel = 'Ready', pendingLabel = 'Pending' }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(initialUrl || null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl || null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadedUrl(null)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={uploadedUrl || ''} />
      <div className="flex flex-col gap-4">
        <input 
          type="file" 
          name={`${name}_file`} 
          accept="image/*" 
          onChange={handleFileChange} 
          disabled={saving}
          required={required && !uploadedUrl}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
        />
        {preview && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 bg-slate-50">
            <div className="flex items-center gap-6">
              <Image 
                src={preview} 
                alt="preview" 
                className="h-24 w-24 object-cover rounded-2xl border border-slate-200 shadow-sm bg-white" 
                width={96} 
                height={96} 
              />
              <div className="flex flex-col gap-3">
                {uploadedUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-semibold" dir="auto">{readyLabel}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-orange-600 font-semibold" dir="auto">{pendingLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
