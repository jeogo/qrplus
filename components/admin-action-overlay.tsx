"use client"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useEffect } from "react"

export type ActionState =
  | { status: 'idle' }
  | { status: 'processing'; messageAr: string; messageFr: string }
  | { status: 'success'; messageAr: string; messageFr: string }
  | { status: 'error'; messageAr: string; messageFr: string }

export function AdminActionOverlay({ state, language, onClear, autoHideMs = 1400 }: { state: ActionState; language: 'ar' | 'fr'; onClear: () => void; autoHideMs?: number }) {
  useEffect(() => {
    if (state.status === 'success' || state.status === 'error') {
      const t = setTimeout(onClear, autoHideMs)
      return () => clearTimeout(t)
    }
  }, [state, onClear, autoHideMs])

  if (state.status === 'idle') return null

  const isAr = language === 'ar'
  const common = 'fixed inset-0 z-[70] flex items-center justify-center'
  const backdrop = 'backdrop-blur-sm bg-background/40'
  const box = 'w-full max-w-xs rounded-lg shadow-lg border border-border bg-card px-5 py-6 flex flex-col items-center gap-3 text-center'

  const msg = isAr ? state.messageAr : state.messageFr

  return (
    <div className={common + ' ' + backdrop}>
      <div className={box}>
        {state.status === 'processing' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
        {state.status === 'success' && <CheckCircle2 className="h-8 w-8 text-green-500" />}
        {state.status === 'error' && <XCircle className="h-8 w-8 text-destructive" />}
        <p className="text-sm font-medium leading-relaxed">{msg}</p>
      </div>
    </div>
  )
}
