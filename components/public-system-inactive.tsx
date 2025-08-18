"use client"
import { PowerOff, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function PublicSystemInactive({ language, onRetry }: { language: 'ar' | 'fr'; onRetry: () => void }) {
  const [reloading, setReloading] = useState(false)
  const t = language === 'ar'
    ? {
        title: 'النظام غير متاح حاليًا',
        desc: 'نقوم بصيانة سريعة أو تم إيقاف النظام مؤقتًا. يرجى المحاولة لاحقًا.',
        retry: 'إعادة المحاولة',
      }
    : {
        title: 'Système indisponible',
        desc: 'Une maintenance rapide est en cours ou le système est temporairement arrêté. Réessayez plus tard.',
        retry: 'Réessayer',
      }
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
        <PowerOff className="h-10 w-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold mb-3">{t.title}</h1>
      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">{t.desc}</p>
      <button
        onClick={() => { setReloading(true); onRetry(); setTimeout(()=>setReloading(false), 1200) }}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow hover:opacity-90 disabled:opacity-60"
        disabled={reloading}
      >
        {reloading && <RefreshCw className="h-4 w-4 animate-spin" />}
        {!reloading && <RefreshCw className="h-4 w-4" />}
        {t.retry}
      </button>
    </div>
  )
}
