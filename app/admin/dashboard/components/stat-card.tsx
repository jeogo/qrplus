"use client"
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ComponentType } from 'react'

interface StatCardProps {
  title: string
  value: number
  unit?: string
  href: string
  icon: ComponentType<{ className?: string }>
  accent: string
  accentBg: string
  loading?: boolean
}

export function StatCard({ title, value, unit, href, icon:Icon, accent, accentBg, loading }: StatCardProps) {
  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl">
      <Card className={cn("group border border-border/60 shadow-soft hover:shadow-lg hover:border-primary/40 transition-all duration-300 bg-gradient-to-br from-background to-muted/30", loading && 'opacity-60 pointer-events-none')}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground group-hover:text-foreground/80 transition-colors">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors tabular-nums">{loading? '–' : value}</p>
                {unit && <p className="text-[11px] uppercase text-muted-foreground font-medium">{unit}</p>}
              </div>
            </div>
            <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3", accentBg)}>
              <Icon className={cn("h-5 w-5", accent)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
