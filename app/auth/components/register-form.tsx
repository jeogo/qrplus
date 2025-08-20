"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { authI18n, AuthLang } from '@/lib/i18n/auth'

interface RegisterFormProps {
  language: AuthLang
  isLoading: boolean
  setIsLoading: (v: boolean)=> void
}

export function RegisterForm({ language, isLoading, setIsLoading }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const t = authI18n[language]

  function validateEmail(v: string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    const form = new FormData(e.currentTarget)
    const username = form.get('username') as string
    const restaurantName = form.get('restaurantName') as string
    const email = form.get('email') as string
    const password = form.get('password') as string
    const confirmPassword = form.get('confirmPassword') as string
    const defaultLanguage = form.get('defaultLanguage') as string

    const newErr: Record<string,string> = {}
    if(!username || !restaurantName || !password || !confirmPassword || !defaultLanguage) newErr.general = t.allFieldsRequired
    if(email && !validateEmail(email)) newErr.email = t.invalidEmail
    if(password !== confirmPassword) newErr.confirmPassword = t.passwordMismatch
    if(password && password.length < 6) newErr.password = t.weakPassword
    if(Object.keys(newErr).length){ setErrors(newErr); setIsLoading(false); return }

    try {
      const r = await fetch('/api/auth/register',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, restaurant_name: restaurantName, email, password, language: defaultLanguage })})
      const j = await r.json()
      if(j.success){
        toast.success(t.registerSuccess)
        window.location.href = '/admin/dashboard'
      }
      else {
        setErrors({general: j.error})
        toast.error(j.error || t.invalidCredentials)
      }
    } catch {
      setErrors({general: t.invalidCredentials})
      toast.error(t.invalidCredentials)
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-xs font-medium text-foreground">{t.username} *</Label>
          <Input id="username" name="username" required disabled={isLoading} className="h-10 disabled:opacity-60" placeholder={t.username} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="restaurantName" className="text-xs font-medium text-foreground">{t.restaurantName} *</Label>
          <Input id="restaurantName" name="restaurantName" required disabled={isLoading} className="h-10 disabled:opacity-60" placeholder={t.restaurantName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">{t.email} <span className="text-muted-foreground">({t.optional})</span></Label>
          <Input id="email" name="email" type="email" disabled={isLoading} className="h-10 disabled:opacity-60" placeholder={t.email} />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">{t.password} *</Label>
          <div className="relative">
            <Input id="password" name="password" type={showPassword? 'text':'password'} required disabled={isLoading} className="h-10 pr-10 disabled:opacity-60" placeholder={t.password} />
            <Button type="button" variant="ghost" size="sm" disabled={isLoading} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={()=> setShowPassword(s=>!s)}>
              {showPassword? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">{t.confirmPassword} *</Label>
          <div className="relative">
            <Input id="confirmPassword" name="confirmPassword" type={showConfirm? 'text':'password'} required disabled={isLoading} className="h-10 pr-10 disabled:opacity-60" placeholder={t.confirmPassword} />
            <Button type="button" variant="ghost" size="sm" disabled={isLoading} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={()=> setShowConfirm(s=>!s)}>
              {showConfirm? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage" className="text-xs font-medium text-foreground">{t.defaultLanguage} *</Label>
          <Select name="defaultLanguage" defaultValue="ar" disabled={isLoading}>
            <SelectTrigger className="h-10 disabled:opacity-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">{t.arabic}</SelectItem>
              <SelectItem value="fr">{t.french}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="logo" className="text-xs font-medium text-foreground">{t.restaurantLogo} <span className="text-muted-foreground">({t.optional})</span></Label>
          <div className="flex items-center gap-2">
            <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg" className="hidden" onChange={e=> { const f = e.target.files?.[0]; if(f && (f.type==='image/png'||f.type==='image/jpeg')) setLogoFile(f) }} />
            <Button type="button" variant="outline" disabled={isLoading} onClick={()=> document.getElementById('logo')?.click()} className="h-10 gap-2 disabled:opacity-60">
              <Upload className="h-4 w-4" /> {logoFile? logoFile.name : t.chooseFile}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">{t.pngJpgOnly}</p>
        </div>
      </div>
      {errors.general && <div className="text-red-600 text-xs bg-red-50 border border-red-200 p-2 rounded">{errors.general}</div>}
      <Button disabled={isLoading} type="submit" className="w-full h-10 gap-2">
        {isLoading? <><Loader2 className="h-4 w-4 animate-spin" /> {t.redirecting}</> : <><UserPlus className="h-4 w-4" /> {t.registerButton}</>}
      </Button>
    </form>
  )
}
