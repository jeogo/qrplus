"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, RotateCcw } from "lucide-react"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { AdminActionOverlay } from "@/components/admin-action-overlay"
import { useAdminActionOverlay } from "@/hooks/use-admin-action"
import { recordSystemActive } from "@/lib/system-active"
import { getAdminSettingsTexts } from "@/lib/i18n/admin-settings"
import { SystemStatusCard } from './components/system-status-card'
import { RestaurantInfoForm } from './components/restaurant-info-form'
import { OfflineAlert } from './components/offline-alert'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'

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
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  // reset daily number dialog state (must be before any early returns)
  const [resetOpen,setResetOpen] = useState(false)
  const [resetLoading,setResetLoading] = useState(false)
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
    if (!settings) return
    // optimistic update
    const prev = settings.system_active
    setSettings(s => s ? { ...s, system_active: checked } : s)
    setIsToggling(true)
    action.start('تحديث الحالة...', 'Mise à jour...')
    try {
      const res = await fetch('/api/admin/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ system_active: checked }) })
      const json = await res.json()
      if(!json.success) throw new Error(json.error)
      setSettings(s => s ? { ...s, system_active: json.data.system_active, updated_at: json.data.updated_at } : s)
      recordSystemActive(json.data.system_active)
      action.success(checked ? 'تم تفعيل النظام' : 'تم إيقاف النظام', checked ? 'Système activé' : 'Système désactivé')
      toast.success(checked ? (language==='ar'? 'تم التفعيل':'Activé') : (language==='ar'? 'تم الإيقاف':'Désactivé'))
  } catch {
      // rollback
      setSettings(s => s ? { ...s, system_active: prev } : s)
      action.error('فشل تحديث الحالة', 'Échec de la mise à jour')
      toast.error(language==='ar'? 'فشل التحديث':'Échec de mise à jour')
    } finally { setIsToggling(false) }
  }

  const handleSaveSettings = async (formData: FormData) => {
    if(!settings) return
    setIsSaving(true)
    action.start('جاري الحفظ...', 'Enregistrement...')
    const updatedSettings: Partial<RestaurantSettings> = {
      restaurant_name: formData.get('restaurant_name') as string,
      language: formData.get('language') as 'ar' | 'fr',
      currency: formData.get('currency') as 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD',
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
    }
    // optimistic merge
    setSettings(s => s ? { ...s, ...updatedSettings } : s)
    try {
      const res = await fetch('/api/admin/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updatedSettings) })
      const json = await res.json()
      if(!json.success) throw new Error(json.error)
      setSettings(s => s ? { ...s, updated_at: json.data.updated_at } : s)
      if (updatedSettings.language && updatedSettings.language !== language) {
        try {
          localStorage.setItem('admin-language', updatedSettings.language)
          localStorage.setItem('language', updatedSettings.language)
          window.dispatchEvent(new CustomEvent('languageChange', { detail: updatedSettings.language }))
        } catch {}
      }
      if (typeof json.data.system_active === 'boolean') recordSystemActive(json.data.system_active)
      action.success('تم حفظ الإعدادات', 'Paramètres enregistrés')
      toast.success(language==='ar'? 'تم الحفظ' : 'Enregistré')
  } catch {
      action.error('فشل حفظ الإعدادات', "Échec de l'enregistrement")
      toast.error(language==='ar'? 'فشل الحفظ' : 'Échec')
      // no rollback for simplicity unless needed
    } finally { setIsSaving(false) }
  }

  const handleLogoUpload = async (file: File) => {
    if (!['image/png','image/jpeg','image/jpg','image/webp'].includes(file.type)) { toast.error(language==='ar'? 'نوع ملف غير صالح':'Type de fichier invalide'); return }
    if (file.size > 5*1024*1024) { toast.error(language==='ar'? 'حجم كبير':'Fichier trop grand'); return }
    setUploading(true)
    action.start('جاري رفع الشعار...', 'Téléchargement du logo...')
    try {
      const fd = new FormData(); fd.append('logo', file)
      const res = await fetch('/api/admin/settings/logo', { method:'POST', body: fd })
      const json = await res.json()
      if(!json.success) throw new Error(json.error)
      setSettings(s => s ? { ...s, logo_url: json.data.logo_url, updated_at: json.data.updated_at } : s)
      action.success('تم رفع الشعار', 'Logo téléchargé')
      toast.success(language==='ar'? 'تم رفع الشعار':'Logo mis à jour')
  } catch {
      action.error('فشل رفع الشعار', 'Échec du téléchargement')
      toast.error(language==='ar'? 'فشل الرفع':'Échec upload')
    } finally { setUploading(false) }
  }

  // removed unused helper formatDateTime (lint cleanup)

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

  const handleResetDaily = async () => {
    setResetLoading(true)
    try {
      const res = await fetch('/api/admin/maintenance/reset-daily-number',{ method:'POST', headers:{'Content-Type':'application/json'} })
      const json = await res.json()
      if(!json.success) throw new Error(json.error)
      toast.success(language==='ar'? L.resetSuccess : L.resetSuccess)
      setResetOpen(false)
    } catch {
      toast.error(language==='ar'? L.resetFailed : L.resetFailed)
    } finally { setResetLoading(false) }
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
              <div className="flex items-center gap-2 flex-wrap">
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
                <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      {L.resetDailyNumber}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className={language==='ar'? 'rtl text-right':'ltr'}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{L.confirmResetDailyTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{L.confirmResetDailyDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={language==='ar'? 'rtl flex-row-reverse':'ltr'}>
                      <AlertDialogCancel disabled={resetLoading}>{L.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetDaily} disabled={resetLoading} className="bg-red-600 hover:bg-red-700">
                        {resetLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {L.confirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
          {!isOnline && (<OfflineAlert L={L} />)}

          <div className="max-w-4xl mx-auto space-y-6">
            <SystemStatusCard active={settings.system_active} updatedAt={settings.updated_at} language={language} L={L} onToggle={handleSystemToggle} disabled={!isOnline || isToggling} />
            <RestaurantInfoForm settings={settings} language={language} L={L} disabled={!isOnline} uploading={uploading} isSaving={isSaving} onSave={handleSaveSettings} onUploadLogo={handleLogoUpload} />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
