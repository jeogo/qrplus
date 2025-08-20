"use client";
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WifiOff } from 'lucide-react'

interface SettingsTexts {
  offlineMode: string
  offlineDescription: string
}

export function OfflineAlert({ L }: { L: SettingsTexts }){
  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800 rounded-xl shadow-sm">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        <strong>{L.offlineMode}</strong> - {L.offlineDescription}
      </AlertDescription>
    </Alert>
  )
}
