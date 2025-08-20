"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Loader2, Power, Wifi } from 'lucide-react'
import { useState } from 'react'

interface SettingsTexts {
  systemStatus: string
  systemActiveDescription: string
  systemInactiveDescription: string
  systemOn: string
  systemOff: string
  toggleSystem: string
  lastUpdated: string
}

interface Props {
  active: boolean
  updatedAt: string
  language: 'ar' | 'fr'
  L: SettingsTexts
  onToggle: (next: boolean)=> Promise<void>
  disabled?: boolean
}

export function SystemStatusCard({ active, updatedAt, language, L, onToggle, disabled }: Props){
  const [localLoading, setLocalLoading] = useState(false)

  const handle = async (val: boolean) => {
    setLocalLoading(true)
    try { await onToggle(val) } finally { setLocalLoading(false) }
  }

  const date = new Date(updatedAt)
  const formatted = date.toLocaleString(language === 'ar' ? 'ar-SA' : 'fr-FR')

  return (
    <Card className="shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center mb-4">
          <div className={`p-4 rounded-full shadow-sm ${active ? 'bg-gradient-to-r from-green-100 to-green-200' : 'bg-gradient-to-r from-red-100 to-red-200'}`}>
            <Power className={`h-8 w-8 ${active ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
        <CardTitle className="text-xl text-slate-900">{L.systemStatus}</CardTitle>
        <CardDescription className="text-slate-600">
          {active ? L.systemActiveDescription : L.systemInactiveDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium text-slate-900">{L.systemStatus}</span>
          </div>
          <Badge variant={active ? 'default':'destructive'} className="text-sm shadow-sm">
            {active ? L.systemOn : L.systemOff}
          </Badge>
        </div>
        <div className="flex items-center justify-between p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Power className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-900">{L.toggleSystem}</span>
          </div>
          <div className="relative flex items-center">
            <Switch checked={active} onCheckedChange={handle} disabled={disabled || localLoading} className="scale-125" />
            {localLoading && <Loader2 className="h-4 w-4 animate-spin absolute -right-6 text-slate-500" />}
          </div>
        </div>
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span>{L.lastUpdated}:</span>
            </div>
            <span>{formatted}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
