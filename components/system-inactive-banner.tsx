"use client"
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAdminLanguage } from './admin-header'
import { useSystemActive } from '@/hooks/use-system-active'

export function SystemInactiveBanner() {
  const active = useSystemActive(true)
  const language = useAdminLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(()=>{ setVisible(!active) }, [active])
  if (!visible) return null
  const msg = language==='ar'
    ? 'النظام متوقف حالياً - لا تُقبل أي عمليات أو طلبات جديدة'
    : 'Le système est arrêté - aucune action ni nouvelle commande n\'est acceptée'
  return (
    <div className="w-full bg-red-600 text-white text-sm py-2 px-4 flex items-center gap-2 justify-center font-medium z-50">
      <AlertTriangle className="h-4 w-4" />
      {msg}
    </div>
  )
}
