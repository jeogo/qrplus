"use client"
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface QuickActionCardProps {
  title: string
  description: string
  icon: ReactNode
  href: string
  accentClass?: string
  buttonLabel: string
  delay?: number
}

export function QuickActionCard({ title, description, icon, href, accentClass, buttonLabel, delay=0 }: QuickActionCardProps) {
  return (
    <Card className={cn('group border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-background to-muted/20 overflow-hidden relative', accentClass)} style={{animationDelay: `${delay}s`}}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all text-primary flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors" dir="auto">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-2 group-hover:text-foreground/60 transition-colors line-clamp-2" dir="auto">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 relative z-10">
        <Link href={href} className="block">
          <Button className="w-full" size="sm">{buttonLabel}</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
