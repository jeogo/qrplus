"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { Download, X } from 'lucide-react'

// Shows an install banner ONLY for staff roles (admin, waiter, kitchen).
// It listens for beforeinstallprompt and defers. For iOS (no event) we show manual hint.
// Minimal typing for the (currently) non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

export function PWAInstallBanner(){
  const { user } = useSession()
  const role = user?.role
  const allowed = role && ['admin','waiter','kitchen'].includes(role)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(()=>{
    if(typeof window === 'undefined') return
    const nav = navigator as Navigator & { standalone?: boolean }
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || nav.standalone
    setIsInstalled(!!standalone)
  },[])

  useEffect(()=>{
    if(!allowed) return
    function handler(e: Event){
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return ()=> window.removeEventListener('beforeinstallprompt', handler as EventListener)
  },[allowed])

  if(!allowed || dismissed || isInstalled) return null
  if(!show && /iphone|ipad|ipod/i.test(typeof navigator!=='undefined'? navigator.userAgent:'')){
    // iOS hint (no beforeinstallprompt)
    return (
      <div className='fixed bottom-4 inset-x-0 flex justify-center px-4 z-50'>
        <div className='bg-background/95 backdrop-blur border shadow-lg rounded-xl p-4 flex items-center gap-4 max-w-xl w-full'>
          <div className='text-sm flex-1'>قم بتثبيت التطبيق على شاشتك الرئيسية لتحصل على تجربة أسرع<br/>Installez l&apos;app sur l&apos;écran d&apos;accueil pour une meilleure expérience.</div>
          <Button size='sm' variant='outline' onClick={()=> setDismissed(true)}>OK</Button>
        </div>
      </div>
    )
  }
  if(!show) return null
  return (
    <div className='fixed bottom-4 inset-x-0 flex justify-center px-4 z-50'>
      <div className='bg-background/95 backdrop-blur border shadow-lg rounded-xl p-4 flex items-center gap-4 max-w-xl w-full'>
        <div className='text-sm flex-1'>ثبّت تطبيق الإدارة لسرعة أعلى بدون متصفح<br/>Installez l&apos;app pour une vitesse accrue hors navigateur.</div>
        <div className='flex items-center gap-2'>
          <Button size='sm' onClick={async()=>{ try { await deferred?.prompt(); setDeferred(null); setShow(false) } catch{} }}> <Download className='h-4 w-4 mr-1' /> {role==='admin'? 'Install' : 'Installer'}</Button>
          <Button size='icon' variant='ghost' onClick={()=> setDismissed(true)}><X className='h-4 w-4'/></Button>
        </div>
      </div>
    </div>
  )
}
