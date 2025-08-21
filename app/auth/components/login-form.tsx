"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authI18n, AuthLang } from '@/lib/i18n/auth'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { notify } from '@/lib/notifications/facade'

interface LoginFormProps {
  language: AuthLang
  onSuccess: (role?: string) => void
  isLoading: boolean
  setIsLoading: (v: boolean) => void
}

export function LoginForm({ language, onSuccess, isLoading, setIsLoading }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const t = authI18n[language]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    const form = new FormData(e.currentTarget)
    const email = form.get('usernameOrEmail') as string
    const password = form.get('password') as string
    if(!email || !password) { setErrors({general: t.allFieldsRequired}); setIsLoading(false); return }
    try {
      const r = await fetch('/api/auth/login',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password })})
      const j = await r.json()
      if(j.success){
        notify({ type:'auth.login.success' })
        onSuccess(j.user?.role)
      } else {
        setErrors({general: j.error || t.invalidCredentials})
        notify({ type:'auth.login.error' })
      }
	} catch{
      setErrors({general: t.invalidCredentials})
      notify({ type:'auth.login.error' })
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="usernameOrEmail" className="text-xs font-medium text-foreground">{t.usernameOrEmail}</Label>
  <Input id="usernameOrEmail" name="usernameOrEmail" required disabled={isLoading} placeholder={t.usernameOrEmail} className="h-10 disabled:opacity-60" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-medium text-foreground">{t.password}</Label>
        <div className="relative">
          <Input id="password" name="password" type={showPassword? 'text':'password'} required disabled={isLoading} placeholder={t.password} className="h-10 pr-10 disabled:opacity-60" />
          <Button type="button" variant="ghost" size="sm" disabled={isLoading} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={()=> setShowPassword(s=>!s)}>
            {showPassword? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {errors.general && <div className="text-red-600 text-xs bg-red-50 border border-red-200 p-2 rounded">{errors.general}</div>}
      <Button disabled={isLoading} type="submit" className="w-full h-10 gap-2">
        {isLoading? <><Loader2 className="h-4 w-4 animate-spin" /> {t.redirecting}</> : <><LogIn className="h-4 w-4" /> {t.loginButton}</>}
      </Button>
    </form>
  )
}
