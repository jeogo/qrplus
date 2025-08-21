"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Globe, ChefHat, LogIn, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { authI18n, AuthLang } from '@/lib/i18n/auth'
import { LoginForm } from './components/login-form'
import { RegisterForm } from './components/register-form'


export default function AuthPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<AuthLang>("ar")
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const currentLang = authI18n[language]

  // Load saved language preference & check session
  useEffect(() => {
    setMounted(true)
    const savedLang = localStorage.getItem("admin-language") as AuthLang
    if (savedLang) setLanguage(savedLang)
    
    // Session check to redirect if already logged in (can't rely on httpOnly cookie visibility)
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json()
          if (j?.success) {
            const role = j?.user?.role
            if (role === 'kitchen') router.replace('/kitchen')
            else if (role === 'waiter') router.replace('/waiter')
            else router.replace('/admin/dashboard')
          }
        }
      } catch {/* ignore */}
    })()
  }, [router])

  if (!mounted) {
    return null
  }

  const handleLanguageToggle = () => {
    const newLang: AuthLang = language === "ar" ? "fr" : language === 'fr' ? 'en' : 'ar'
    setLanguage(newLang)
    localStorage.setItem("admin-language", newLang)
  }

  const handleAuthSuccess = (role?: string) => {
    if (role === 'kitchen') router.replace('/kitchen')
    else if (role === 'waiter') router.replace('/waiter')
    else router.replace('/admin/dashboard')
  }

  return (
    <div className={`min-h-screen flex flex-col ${language==='ar'?'rtl':'ltr'} bg-gradient-to-br from-background via-background to-muted/40`}> 
      <header className="h-14 flex items-center justify-between px-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-md bg-primary text-primary-foreground shadow-soft"><ChefHat className="h-4 w-4" /></div>
          <span className="font-semibold text-sm tracking-tight text-foreground">{currentLang.systemName}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLanguageToggle} className="text-xs gap-1">
          <Globe className="h-4 w-4" /> {language==='ar'?'FR': language==='fr' ? 'EN':'AR'}
        </Button>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl grid lg:grid-cols-2 gap-8 items-start">
          <div className="hidden lg:flex flex-col gap-4 pe-4 border-e">
            <h1 className="text-2xl font-bold leading-tight text-foreground">{currentLang.welcomeHeadline}</h1>
            <p className="text-sm text-soft leading-relaxed">{currentLang.welcomeSub}</p>
            <ul className="space-y-2 text-xs text-dim mt-2">
              {authI18n[language].features.map((f,i)=> <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> {f}</li>)}
            </ul>
          </div>
          <div className="space-y-5">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-3 bg-muted p-1 rounded-lg">
                <TabsTrigger value="login" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">{currentLang.login}</TabsTrigger>
                <TabsTrigger value="register" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">{currentLang.register}</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-0">
                <Card className="surface shadow-soft">
                  <CardHeader className="pb-4 text-center">
                    <CardTitle className="text-base font-semibold flex items-center justify-center gap-2"><LogIn className="h-4 w-4" /> {currentLang.login}</CardTitle>
                    <CardDescription className="text-xs text-soft">{currentLang.systemDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LoginForm language={language} onSuccess={handleAuthSuccess} isLoading={isLoading} setIsLoading={setIsLoading} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="register" className="mt-0">
                <Card className="surface shadow-soft">
                  <CardHeader className="pb-4 text-center">
                    <CardTitle className="text-base font-semibold flex items-center justify-center gap-2"><UserPlus className="h-4 w-4" /> {currentLang.register}</CardTitle>
                    <CardDescription className="text-xs text-soft">{currentLang.systemDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RegisterForm language={language} isLoading={isLoading} setIsLoading={setIsLoading} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <p className="text-[11px] text-center text-dim">© {new Date().getFullYear()} {currentLang.systemName}</p>
          </div>
        </div>
      </main>
    </div>
  )
}