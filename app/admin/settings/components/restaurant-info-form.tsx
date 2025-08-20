"use client";
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Upload, Building } from 'lucide-react'
import { useState } from 'react'

interface RestaurantSettingsPartial {
  restaurant_name: string;
  language: 'ar' | 'fr';
  currency: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD';
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

interface SettingsTexts {
  restaurantInfo: string
  description: string
  restaurantName: string
  language: string
  arabic: string
  french: string
  currency: string
  phone: string
  optional: string
  email: string
  address: string
  restaurantLogo: string
  uploadLogoDesc: string
  uploading: string
  updateLogo: string
  fileSelected: string
  save: string
  saving: string
}

interface Props {
  settings: RestaurantSettingsPartial
  language: 'ar' | 'fr'
  L: SettingsTexts
  disabled: boolean
  uploading: boolean
  isSaving: boolean
  onSave: (data: FormData)=> Promise<void>
  onUploadLogo: (file: File)=> Promise<void>
}

export function RestaurantInfoForm({ settings, language, L, disabled, uploading, isSaving, onSave, onUploadLogo }: Props){
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    await onSave(fd)
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    await onUploadLogo(file)
    setLogoFile(null)
    if (e.target) e.target.value = ''
  }

  return (
  <Card className="shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-sm" data-lang={language}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Building className="h-5 w-5 text-blue-600" />
          {L.restaurantInfo}
        </CardTitle>
        <CardDescription className="text-slate-600">{L.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="restaurant_name" className="text-slate-700 font-medium">{L.restaurantName}</Label>
              <Input id="restaurant_name" name="restaurant_name" defaultValue={settings.restaurant_name} required className="border-slate-200 focus:border-blue-500 focus:ring-blue-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language" className="text-slate-700 font-medium">{L.language}</Label>
              <Select name="language" defaultValue={settings.language}>
                <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{L.arabic}</SelectItem>
                  <SelectItem value="fr">{L.french}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-slate-700 font-medium">{L.currency}</Label>
              <Select name="currency" defaultValue={settings.currency}>
                <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="MAD">MAD (DH)</SelectItem>
                  <SelectItem value="TND">TND (د.ت)</SelectItem>
                  <SelectItem value="DZD">DZD (دج)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700 font-medium">{L.phone} <span className="text-slate-500 font-normal">({L.optional})</span></Label>
              <Input id="phone" name="phone" type="tel" defaultValue={settings.phone || ''} className="border-slate-200 focus:border-blue-500 focus:ring-blue-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">{L.email} <span className="text-slate-500 font-normal">({L.optional})</span></Label>
              <Input id="email" name="email" type="email" defaultValue={settings.email || ''} className="border-slate-200 focus:border-blue-500 focus:ring-blue-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-slate-700 font-medium">{L.address} <span className="text-slate-500 font-normal">({L.optional})</span></Label>
            <Textarea id="address" name="address" defaultValue={settings.address || ''} className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]" />
          </div>
          <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="logo" className="text-slate-700 font-medium">{L.restaurantLogo}</Label>
                <p className="text-sm text-slate-500">{L.uploadLogoDesc}</p>
              </div>
              {settings.logo_url && (
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm bg-white">
                    <Image src={settings.logo_url} alt="Logo" width={64} height={64} className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" id="logo-upload" />
                <Button type="button" variant="outline" disabled={uploading} className="relative border-slate-200 hover:bg-slate-50" asChild>
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    {uploading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> {L.uploading}</>) : (<><Upload className="w-4 h-4 mr-2" /> {L.updateLogo}</>)}
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
          <div className="pt-6 border-t border-slate-200">
            <Button type="submit" disabled={disabled || isSaving} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md w-full md:w-auto">
              {isSaving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />{L.saving}</>) : (<><Save className="h-4 w-4 mr-2" />{L.save}</>)}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
