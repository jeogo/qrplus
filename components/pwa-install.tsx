"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Register service worker
    if ("serviceWorker" in navigator) {
        const swUrl = '/firebase-messaging-sw.js'
        navigator.serviceWorker.getRegistration(swUrl).then(existing => {
          if (!existing) {
            navigator.serviceWorker.register(swUrl).catch(err => {
              console.warn('[PWA][SW] registration failed', err)
            })
          }
        }).catch(()=>{})
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showInstallPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-50 max-w-sm mx-auto">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install Restaurant Admin</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Install this app for quick access and offline functionality
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0 ml-2">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleInstallClick} size="sm" className="flex-1 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Install
        </Button>
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          Later
        </Button>
      </div>
    </div>
  )
}
