"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { Download, X } from 'lucide-react'

// Shows an install banner ONLY for staff roles (admin, waiter, kitchen).
// It listens for beforeinstallprompt and defers. For iOS (no event) we show manual hint.
export function PWAInstallBanner(){
  const { user } = useSession()
  const role = user?.role
  const allowed = role && ['admin','waiter','kitchen'].includes(role)
  const [deferred, setDeferred] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(()=>{
    if(typeof window === 'undefined') return
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone
    setIsInstalled(!!standalone)
  },[])

  useEffect(()=>{
    if(!allowed) return
    function handler(e: Event){
      e.preventDefault()
      setDeferred(e as any)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return ()=> window.removeEventListener('beforeinstallprompt', handler as any)
  },[allowed])

  if(!allowed || dismissed || isInstalled) return null
  if(!show && /iphone|ipad|ipod/i.test(typeof navigator!=='undefined'? navigator.userAgent:'')){
    // iOS hint (no beforeinstallprompt)
    return (
      <div className='fixed bottom-4 inset-x-0 flex justify-center px-4 z-50'>
        <div className='bg-background/95 backdrop-blur border shadow-lg rounded-xl p-4 flex items-center gap-4 max-w-xl w-full'>
          <div className='text-sm flex-1'>قم بتثبيت التطبيق على شاشتك الرئيسية لتحصل على تجربة أسرع<br/>Installez l\'app sur l\'écran d\'accueil pour une meilleure expérience.</div>
          <Button size='sm' variant='outline' onClick={()=> setDismissed(true)}>OK</Button>
        </div>
      </div>
    )
  }
  if(!show) return null
  return (
    <div className='fixed bottom-4 inset-x-0 flex justify-center px-4 z-50'>
      <div className='bg-background/95 backdrop-blur border shadow-lg rounded-xl p-4 flex items-center gap-4 max-w-xl w-full'>
        <div className='text-sm flex-1'>ثبّت تطبيق الإدارة لسرعة أعلى بدون متصفح<br/>Installez l\'app pour une vitesse accrue hors navigateur.</div>
        <div className='flex items-center gap-2'>
          <Button size='sm' onClick={async()=>{ try { await (deferred as any).prompt(); setDeferred(null); setShow(false) } catch{} }}> <Download className='h-4 w-4 mr-1' /> {role==='admin'? 'Install' : 'Installer'}</Button>
          <Button size='icon' variant='ghost' onClick={()=> setDismissed(true)}><X className='h-4 w-4'/></Button>
        </div>
      </div>
    </div>
  )
}
