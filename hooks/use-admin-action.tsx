"use client"
import { useCallback, useEffect, useState } from 'react'
import type { ActionState } from '@/components/admin-action-overlay'

export function useAdminActionOverlay(initialLang: 'ar' | 'fr' | 'en' = 'en') {
  const [language, setLanguage] = useState<'ar' | 'fr' | 'en'>(initialLang)
  const [state, setState] = useState<ActionState>({ status: 'idle' })

  // listen for global language changes
  useEffect(() => {
  const handler = () => {
      if (typeof window === 'undefined') return
  const stored = (localStorage.getItem('language') || localStorage.getItem('admin-language')) as 'ar' | 'fr' | 'en' | null
  if (stored === 'ar' || stored === 'fr' || stored==='en') setLanguage(stored)
    }
    handler()
    window.addEventListener('languageChange', handler)
    return () => window.removeEventListener('languageChange', handler)
  }, [])

  const start = useCallback((messageAr: string, messageFr: string, messageEn?:string) => {
    setState({ status: 'processing', messageAr, messageFr, messageEn: messageEn || messageFr })
  }, [])

  const success = useCallback((messageAr: string, messageFr: string, messageEn?:string) => {
    setState({ status: 'success', messageAr, messageFr, messageEn: messageEn || messageFr })
  }, [])

  const error = useCallback((messageAr: string, messageFr: string, messageEn?:string) => {
    setState({ status: 'error', messageAr, messageFr, messageEn: messageEn || messageFr })
  }, [])

  const clear = useCallback(() => setState({ status: 'idle' }), [])

  return { language, state, start, success, error, clear }
}
