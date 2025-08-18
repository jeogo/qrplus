"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// removed Select for auto category assignment
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Edit, Trash2, Loader2, RefreshCw, Image as ImageIcon } from "lucide-react"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminMenuTexts } from "@/lib/i18n/admin-menu"

interface Category {
  id: number
  account_id: number
  name: string
  description?: string
  active: boolean
  created_at: string
  updated_at: string
  image_url?: string
}

interface Product {
  id: number
  account_id: number
  category_id: number
  name: string
  description?: string
  price: number
  image_url?: string
  available: boolean
  created_at: string
  updated_at: string
}

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
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const L = useMemo(() => getAdminMenuTexts(language), [language])

  // Restaurant settings (currency, name, language)
  interface MinimalSettings { currency: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD'; restaurant_name: string; language: 'ar' | 'fr' }
  const [settings, setSettings] = useState<MinimalSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

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
          const stored = localStorage.getItem('admin-language') as 'ar' | 'fr' | null
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
  const formatPrice = useCallback((value:number)=> new Intl.NumberFormat(language==='ar'?'ar-DZ':'fr-DZ',{style:'currency',currency,minimumFractionDigits:2}).format(value),[language,currency])

  const refreshCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ success: boolean; data: Category[] }>("/api/categories")
      setCategories(data as unknown as Category[])
    } catch (e) {
      console.error('categories load failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

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

  async function refreshProducts(categoryId?: number) {
    if (!categoryId) return
    try {
      const data = await api<{ success: boolean; data: Product[] }>(`/api/products?category_id=${categoryId}`)
      setProducts(data as unknown as Product[])
    } catch (e) {
      console.error('products load failed', e)
    }
  }

  const handleSave = async (formData: FormData) => {
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
          const res = await fetch(`/api/products/${editingItem.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
          if (!res.ok) throw new Error('Update failed')
          const json = await res.json()
          setProducts(products.map(p => p.id === editingItem.id ? json.data : p))
        } else {
          const res = await fetch('/api/products', { method: 'POST', body: JSON.stringify(payload) })
          if (!res.ok) throw new Error('Create failed')
          const json = await res.json()
          setProducts([...products, json.data])
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
          const res = await fetch(`/api/categories/${editingItem.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
          if (!res.ok) throw new Error('Update failed')
          const json = await res.json()
          setCategories(categories.map(c => c.id === editingItem.id ? json.data : c))
        } else {
          const res = await fetch('/api/categories', { method: 'POST', body: JSON.stringify(payload) })
          if (!res.ok) throw new Error('Create failed')
          const json = await res.json()
          setCategories([...categories, json.data])
        }
      }
      setIsDialogOpen(false)
      setEditingItem(null)
      if (selectedCategory) void refreshProducts(selectedCategory)
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
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
    } catch (error) {
      console.error('Error deleting:', error)
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

  const filteredCategories = categories.filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const filteredProducts = products.filter(
    (prod) =>
  (!selectedCategory || prod.category_id === selectedCategory) &&
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // ... existing code for handlers ...

  return (
    <AdminLayout>
      <AdminHeader title={L.title} showBackButton={!!selectedCategory} onBackClick={()=>setSelectedCategory(null)} backText={L.back} />
      <main className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language==='ar'?'rtl':'ltr'}`}>
        <div className="p-4 pb-24 max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder={L.searchPlaceholder} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={()=>{ setSearchTerm(''); void refreshCategories(); if(selectedCategory) void refreshProducts(selectedCategory) }} className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> {L.refresh}</Button>
                {!selectedCategory ? (
                  <Button onClick={()=>{ setEditingItem(null); setIsProductMode(false); setIsDialogOpen(true) }} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md"><Plus className="h-4 w-4" /> {L.addCategory}</Button>
                ) : (
                  <Button onClick={()=>{ setEditingItem(null); setIsProductMode(true); setIsDialogOpen(true) }} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md"><Plus className="h-4 w-4" /> {L.addProduct}</Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {!selectedCategory && <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-blue-600" /> {L.categories}</h2>}
              {selectedCategory && <h2 className="text-xl font-semibold text-slate-900">{L.productOf} {categories.find(c=>c.id===selectedCategory)?.name}</h2>}
              <div className="flex flex-col items-end gap-1">
                <div className="text-xs md:text-sm text-slate-400 font-medium tracking-wide uppercase">{L.currencyNote}: {currency}{settingsLoading && ' …'}</div>
                {settings?.restaurant_name && !selectedCategory && (
                  <div className="text-[11px] md:text-xs text-slate-400 line-clamp-1 max-w-[200px] md:max-w-xs">{settings.restaurant_name}</div>
                )}
              </div>
            </div>
          </div>
          {!selectedCategory && (
            <div>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-blue-600" /></div>
                  <p className="text-slate-500 mb-4">{L.noCategories}</p>
                  <Button onClick={()=>{ setEditingItem(null); setIsProductMode(false); setIsDialogOpen(true) }} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md"><Plus className="h-4 w-4 mr-2" /> {L.addCategory}</Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCategories.map((category,index)=>(
                    <Card key={category.id} className="relative overflow-hidden group border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md" style={{animationDelay:`${index*0.05}s`}} onClick={()=>{ setSelectedCategory(category.id); setProducts([]); void refreshProducts(category.id) }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-3 relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 flex-1 min-w-0">
                            {category.image_url ? <Image src={category.image_url} alt={category.name} width={64} height={64} className="h-16 w-16 object-cover rounded-xl border-2 border-slate-200 shadow-sm" /> : <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50"><ImageIcon className="w-6 h-6 text-slate-300" /></div>}
                            <div className="space-y-1 min-w-0">
                              <CardTitle className="text-lg truncate">{category.name}</CardTitle>
                              <CardDescription className="text-xs line-clamp-2">{category.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={(e)=>{ e.stopPropagation(); setEditingItem(category); setIsProductMode(false); setIsDialogOpen(true) }} className="hover:bg-slate-100"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" disabled={deletingId===category.id} onClick={(e)=>{ e.stopPropagation(); handleDelete(category.id,false) }} className="hover:bg-slate-100">{deletingId===category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant={category.active ? 'default' : 'secondary'} className={category.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}>{category.active ? L.active : L.inactive}</Badge>
                          <span className="text-slate-400">{products.filter(p=>p.category_id===category.id).length} {L.products}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {selectedCategory && (
            <div>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-blue-600" /></div>
                  <p className="text-slate-500 mb-4">{L.noProducts}</p>
                  <Button onClick={()=>{ setEditingItem(null); setIsProductMode(true); setIsDialogOpen(true) }} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md"><Plus className="h-4 w-4 mr-2" /> {L.addProduct}</Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product,index)=>(
                    <Card key={product.id} className="relative overflow-hidden group border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md" style={{animationDelay:`${index*0.05}s`}}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-3 relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 flex-1 min-w-0">
                            {product.image_url ? <Image src={product.image_url} alt={product.name} width={64} height={64} className="h-16 w-16 object-cover rounded-xl border-2 border-slate-200 shadow-sm" /> : <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50"><ImageIcon className="w-6 h-6 text-slate-300" /></div>}
                            <div className="space-y-1 min-w-0">
                              <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                              <CardDescription className="text-xs line-clamp-2">{product.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={()=>{ setEditingItem(product); setIsProductMode(true); setIsDialogOpen(true) }} className="hover:bg-slate-100"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" disabled={deletingId===product.id} onClick={()=>handleDelete(product.id,true)} className="hover:bg-slate-100">{deletingId===product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-semibold text-blue-600">{formatPrice(product.price)}</span>
                          <Badge variant={product.available ? 'default' : 'secondary'} className={product.available ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}>{product.available ? L.available : L.unavailable}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !saving && setIsDialogOpen(open)}>
          <DialogContent className="sm:max-w-[500px]">
            <form action={handleSave}>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? (isProductMode ? `${L.edit} ${L.products}` : `${L.edit} ${L.categories}`) : (isProductMode ? L.addProduct : L.addCategory)}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? (language==='ar'? 'قم بتعديل البيانات ثم احفظ التغييرات':'Modifiez les informations puis enregistrez') : (language==='ar'? 'أدخل تفاصيل جديدة ثم احفظ':'Renseignez les informations puis enregistrez')}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{L.name}</Label>
                  <Input
                    id="name"
                    name="name"
                    disabled={saving}
                    defaultValue={editingItem ? ("name" in editingItem ? editingItem.name : "") : ""}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">{L.description}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    disabled={saving}
                    defaultValue={editingItem ? ("description" in editingItem ? editingItem.description || "" : "") : ""}
                  />
                </div>

                {isProductMode && (
                  <>
                    <input type="hidden" name="category_id" value={selectedCategory ?? ''} />
                    <div className="text-sm text-muted-foreground">Category: {categories.find(c=>c.id===selectedCategory)?.name}</div>

                    <div className="grid gap-2">
                      <Label htmlFor="price">{L.price}</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        disabled={saving}
                        defaultValue={editingItem ? (editingItem as Product).price : ""}
                        required
                      />
                    </div>

                    <ImageUploader name="image_url" saving={saving} initialUrl={editingItem && 'image_url' in editingItem ? (editingItem as Product).image_url : undefined} required={false} />
                  </>
                )}

                {!isProductMode && (
                  <div className="grid gap-2">
                    <Label htmlFor="image_url">{L.imageUrl}</Label>
                    <ImageUploader name="image_url" saving={saving} required initialUrl={editingItem && 'image_url' in editingItem ? (editingItem as Category).image_url : undefined} />
                  </div>
                )}

                <div className="flex items-center space-x-2">
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
                  <Label htmlFor={isProductMode ? "available" : "active"}>{isProductMode ? L.available : L.active}</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setIsDialogOpen(false)}
                >
                  {L.cancel}
                </Button>
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {L.saving}
                    </>
                  ) : (
                    L.save
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </AdminLayout>
  )
}

interface ImageUploaderProps { name: string; required?: boolean; initialUrl?: string; saving?: boolean }
function ImageUploader({ name, required, initialUrl, saving }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(initialUrl || null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl || null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0]
  if (!f) return
    setUploadedUrl(null) // clear so handleSave knows to upload
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={uploadedUrl || ''} />
      <input 
        type="file" 
        name={`${name}_file`} 
        accept="image/*" 
        onChange={handleFileChange} 
        disabled={saving}
        required={required && !uploadedUrl} 
      />
      {preview && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center gap-4">
            <Image 
              src={preview} 
              alt="preview" 
              className="h-20 w-20 object-cover rounded-xl border-2 border-gray-200 shadow-sm" 
              width={80} 
              height={80} 
            />
            <div className="flex flex-col gap-2">
              {uploadedUrl ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600 font-medium">Ready to save</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-orange-600 font-medium">Will upload on save</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
