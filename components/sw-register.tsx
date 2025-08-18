"use client"
// Ensures firebase-messaging-sw.js is registered early even if PWAInstall component isn't rendered.
// Provides console logs to help debug registration state.
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) {
      console.log('[SW][Bootstrap] serviceWorker API not available')
      return
    }
    const swUrl = '/firebase-messaging-sw.js'
    // Always attempt fresh register (browser will update if script changed).
    navigator.serviceWorker.getRegistration(swUrl).then(existing => {
      if (existing) {
        console.log('[SW][Bootstrap] existing messaging SW', existing.scope)
        return
      }
      navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('[SW][Bootstrap] registered messaging SW', reg.scope)
      }).catch(err => {
        console.warn('[SW][Bootstrap] register failed', err)
      })
    }).catch(() => {
      // Fallback: attempt register anyway
      navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('[SW][Bootstrap] registered (fallback) messaging SW', reg.scope)
      }).catch(err => console.warn('[SW][Bootstrap] register fallback failed', err))
    })
  }, [])
  return null
}
