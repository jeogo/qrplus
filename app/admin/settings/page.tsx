"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Power, Wifi, WifiOff, Upload, Save, Loader2, Building, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { AdminActionOverlay } from "@/components/admin-action-overlay"
import { useAdminActionOverlay } from "@/hooks/use-admin-action"
import { recordSystemActive } from "@/lib/system-active"
import { getAdminSettingsTexts } from "@/lib/i18n/admin-settings"

interface RestaurantSettings {
  id: number
  account_id: number
  restaurant_name: string
  language: 'ar' | 'fr'
  logo_url?: string | null
  currency: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD'
  address?: string | null
  phone?: string | null
  email?: string | null
  system_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminSettingsPage() {
  const language = useAdminLanguage()
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const action = useAdminActionOverlay(language)

  // Get localized text
  const L = getAdminSettingsTexts(language)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/admin/settings', { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`Failed to fetch settings: ${res.status}`)
      }
      
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch settings')
      }
      
      const data = json.data
      setSettings({
        id: data.id,
        account_id: data.account_id,
        restaurant_name: data.restaurant_name || '',
        language: data.language || 'ar',
        logo_url: data.logo_url || null,
        currency: data.currency || 'DZD',
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        system_active: data.system_active !== false,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to load settings')
    } finally { 
      setIsLoading(false) 
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleSystemToggle = async (checked: boolean) => {
    if (!window.confirm(L.confirmToggle)) {
      return
    }

    if (!settings) return

    try {
      setIsToggling(true)
      action.start('تحديث الحالة...', 'Mise à jour...')
      const res = await fetch('/api/admin/settings', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ system_active: checked }) 
      })
      const json = await res.json()
      if (!json.success) {
        console.error('Error updating system status:', json.error)
        return
      }
      setSettings({ ...settings, system_active: json.data.system_active, updated_at: json.data.updated_at })
      // Persist system active state locally & broadcast
  recordSystemActive(json.data.system_active)
      // Re-fetch to ensure consistency
      fetchSettings()

      action.success(
        checked ? 'تم تفعيل النظام' : 'تم إيقاف النظام',
        checked ? 'Système activé' : 'Système désactivé'
      )
    } catch (error) {
      console.error("Failed to update system status:", error)
      action.error('فشل تحديث الحالة', 'Échec de la mise à jour')
    } finally {
      setIsToggling(false)
      // clear overlay slightly later handled by component timeout
    }
  }

  const handleSaveSettings = async (formData: FormData) => {
    if (!settings) return

  setIsSaving(true)
  action.start('جاري الحفظ...', 'Enregistrement...')

    try {
      const updatedSettings: Partial<RestaurantSettings> = {
        restaurant_name: formData.get('restaurant_name') as string,
        language: formData.get('language') as 'ar' | 'fr',
        currency: formData.get('currency') as 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD',
        address: (formData.get('address') as string) || null,
        phone: (formData.get('phone') as string) || null,
        email: (formData.get('email') as string) || null,
      }

      const res = await fetch('/api/admin/settings', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(updatedSettings) 
      })
      const json = await res.json()
      if (!json.success) {
        console.error('Error saving settings:', json.error)
        console.log('Admin: Error saving settings')
        return
      }

      setSettings({ ...settings, ...updatedSettings, updated_at: json.data.updated_at })
      // If language changed, persist locally & broadcast immediately
      if (updatedSettings.language && updatedSettings.language !== language) {
        try {
          // Persist under both keys for backward compatibility
          localStorage.setItem('admin-language', updatedSettings.language)
          localStorage.setItem('language', updatedSettings.language)
          window.dispatchEvent(new CustomEvent('languageChange', { detail: updatedSettings.language }))
        } catch {
          /* ignore persistence errors */
        }
      }
      // Ensure system_active cached
      if (typeof json.data.system_active === 'boolean') {
        recordSystemActive(json.data.system_active)
      }

  action.success('تم حفظ الإعدادات', 'Paramètres enregistrés')
    } catch (error) {
      console.error("Error saving settings:", error)
  action.error('فشل حفظ الإعدادات', "Échec de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      console.log('Admin: Invalid file type for logo upload')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      console.log('Admin: File size too large for logo upload')
      return
    }

  setLogoFile(file)
  setUploading(true)
  action.start('جاري رفع الشعار...', 'Téléchargement du logo...')

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to upload logo')
      }

      // Update settings with new logo URL
      if (settings) {
        setSettings({
          ...settings,
          logo_url: json.data.logo_url,
          updated_at: json.data.updated_at
        })
      }
  // Re-fetch authoritative data
  fetchSettings()

  action.success('تم رفع الشعار', 'Logo téléchargé')
    } catch (error) {
      console.error("Logo upload error:", error)
  action.error('فشل رفع الشعار', 'Échec du téléchargement')
    } finally {
      setUploading(false)
      setLogoFile(null)
      // Reset the file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(language === "ar" ? "ar-SA" : "fr-FR")
  }

  if (!mounted || isLoading) {
    return (
      <AdminLayout>
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
          <AdminHeader title={L.title} />
          <main className="container mx-auto px-4 py-6">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-slate-500 text-lg">{L.loading}</p>
            </div>
          </main>
        </div>
      </AdminLayout>
    )
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
          <AdminHeader title={L.title} />
          <main className="container mx-auto px-4 py-6">
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">No settings found</p>
            </div>
          </main>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AdminHeader title={L.title} />
        
        <div className="p-4 pb-20 space-y-6">
          <AdminActionOverlay state={action.state} language={action.language} onClear={action.clear} />
          
          {/* Header Section with Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 mb-1">{L.manageSettings}</h1>
                <p className="text-sm text-slate-500">{L.systemConfiguration}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSettings}
                disabled={isLoading}
                className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {L.refresh}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {error}
              </div>
            </div>
          )}

          {/* Online/Offline Status */}
          {!isOnline && (
            <Alert className="border-orange-200 bg-orange-50 text-orange-800 rounded-xl shadow-sm">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                <strong>{L.offlineMode}</strong> - {L.offlineDescription}
              </AlertDescription>
            </Alert>
          )}

          <div className="max-w-4xl mx-auto space-y-6">
            {/* System Status Card */}
            <Card className="shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-4 rounded-full shadow-sm ${settings.system_active ? "bg-gradient-to-r from-green-100 to-green-200" : "bg-gradient-to-r from-red-100 to-red-200"}`}>
                    <Power className={`h-8 w-8 ${settings.system_active ? "text-green-600" : "text-red-600"}`} />
                  </div>
                </div>
                <CardTitle className="text-xl text-slate-900">{L.systemStatus}</CardTitle>
                <CardDescription className="text-slate-600">
                  {settings.system_active ? L.systemActiveDescription : L.systemInactiveDescription}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${settings.system_active ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-medium text-slate-900">{L.systemStatus}</span>
                  </div>
                  <Badge 
                    variant={settings.system_active ? "default" : "destructive"} 
                    className="text-sm shadow-sm"
                  >
                    {settings.system_active ? L.systemOn : L.systemOff}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <Power className="h-5 w-5 text-slate-600" />
                    <span className="font-medium text-slate-900">{L.toggleSystem}</span>
                  </div>
                  <div className="relative flex items-center">
                    <Switch
                      checked={settings.system_active}
                      onCheckedChange={handleSystemToggle}
                      disabled={!isOnline || isToggling}
                      className="scale-125"
                    />
                    {isToggling && (
                      <Loader2 className="h-4 w-4 animate-spin absolute -right-6 text-slate-500" />
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span>{L.lastUpdated}:</span>
                    </div>
                    <span>{formatDateTime(settings.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Restaurant Information Card */}
            <Card className="shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Building className="h-5 w-5 text-blue-600" />
                  {L.restaurantInfo}
                </CardTitle>
                <CardDescription className="text-slate-600">{L.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <form action={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Restaurant Name */}
                    <div className="space-y-2">
                      <Label htmlFor="restaurant_name" className="text-slate-700 font-medium">
                        {L.restaurantName}
                      </Label>
                      <Input
                        id="restaurant_name"
                        name="restaurant_name"
                        defaultValue={settings.restaurant_name}
                        required
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-slate-700 font-medium">
                        {L.language}
                      </Label>
                      <Select name="language" defaultValue={settings.language}>
                        <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">{L.arabic}</SelectItem>
                          <SelectItem value="fr">{L.french}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-slate-700 font-medium">
                        {L.currency}
                      </Label>
                      <Select name="currency" defaultValue={settings.currency}>
                        <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="MAD">MAD (DH)</SelectItem>
                          <SelectItem value="TND">TND (د.ت)</SelectItem>
                          <SelectItem value="DZD">DZD (دج)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700 font-medium">
                        {L.phone}{" "}
                        <span className="text-slate-500 font-normal">({L.optional})</span>
                      </Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        defaultValue={settings.phone || ""} 
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium">
                        {L.email}{" "}
                        <span className="text-slate-500 font-normal">({L.optional})</span>
                      </Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        defaultValue={settings.email || ""} 
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-700 font-medium">
                      {L.address}{" "}
                      <span className="text-slate-500 font-normal">({L.optional})</span>
                    </Label>
                    <Textarea 
                      id="address" 
                      name="address" 
                      defaultValue={settings.address || ""} 
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="logo" className="text-slate-700 font-medium">
                          {L.restaurantLogo}
                        </Label>
                        <p className="text-sm text-slate-500">
                          {L.uploadLogoDesc}
                        </p>
                      </div>
                      {/* Current Logo Display */}
                      {settings.logo_url && (
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm bg-white">
                            <Image
                              src={settings.logo_url}
                              alt="Current Logo"
                              className="w-full h-full object-contain"
                              width={64}
                              height={64}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          id="logo-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading}
                          className="relative border-slate-200 hover:bg-slate-50"
                          asChild
                        >
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            {uploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {L.uploading}
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {L.updateLogo}
                              </>
                            )}
                          </label>
                        </Button>
                      </div>
                      
                      {logoFile && !uploading && (
                        <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                          <span className="font-medium">{L.fileSelected}</span> {logoFile.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-6 border-t border-slate-200">
                    <Button 
                      type="submit" 
                      disabled={isSaving || !isOnline} 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md w-full md:w-auto"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {L.saving}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {L.save}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
