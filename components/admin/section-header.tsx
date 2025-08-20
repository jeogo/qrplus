"use client"
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, icon, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">{icon}</div>}
        <div>
          <h2 className="text-2xl font-bold tracking-tight leading-tight" dir="auto">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1" dir="auto">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
