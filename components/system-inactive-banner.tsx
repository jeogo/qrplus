"use client"
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAdminLanguage } from './admin-header'
import { getAdminSettingsTexts } from '@/lib/i18n/admin-settings'
import { useSystemActive } from '@/hooks/use-system-active'

export function SystemInactiveBanner() {
  const active = useSystemActive(true)
  const language = useAdminLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(()=>{ setVisible(!active) }, [active])
  if (!visible) return null
  const L = getAdminSettingsTexts(language)
  const msg = L.systemInactiveDescription
  return (
    <div className="w-full bg-red-600 text-white text-sm py-2 px-4 flex items-center gap-2 justify-center font-medium z-50">
      <AlertTriangle className="h-4 w-4" />
      {msg}
    </div>
  )
}
