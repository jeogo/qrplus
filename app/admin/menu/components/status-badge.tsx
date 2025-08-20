"use client"
import { memo } from 'react'

interface StatusBadgeProps {
  label: string
  state?: 'on' | 'off'
}

export const StatusBadge = memo(function StatusBadge({ label, state='on' }: StatusBadgeProps) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors'
  const cls = state==='on'
    ? 'bg-blue-50 text-blue-600 border border-blue-100'
    : 'bg-slate-50 text-slate-400 border border-slate-200'
  return <span className={base + ' ' + cls}>{label}</span>
})
