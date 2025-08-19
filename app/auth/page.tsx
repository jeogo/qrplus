"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, ChefHat, Upload, Eye, EyeOff, Loader2, LogIn, UserPlus, ShieldCheck, Layers, Users2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { authI18n, AuthLang } from '@/lib/i18n/auth'

// Login Component
interface LoginProps {
  onSuccess: (role?: string) => void
  language: AuthLang
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

function LoginForm({ onSuccess, language, isLoading, setIsLoading }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const currentLang = authI18n[language]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const email = formData.get("usernameOrEmail") as string
    const password = formData.get("password") as string

    if (!email || !password) {
      setErrors({ general: currentLang.allFieldsRequired })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Auth: Login successful')
        onSuccess(result.user?.role)
      } else {
        setErrors({ general: result.error || currentLang.invalidCredentials })
      }
    } catch (error) {
      console.log("[AUTH] Login error:", error)
      setErrors({ general: currentLang.invalidCredentials })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="usernameOrEmail" className="text-sm font-medium text-slate-700">
          {currentLang.usernameOrEmail}
        </Label>
        <Input
          id="usernameOrEmail"
          name="usernameOrEmail"
          type="text"
          required
          className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
          placeholder={currentLang.usernameOrEmail}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
          {currentLang.password}
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className="h-11 pr-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
            placeholder={currentLang.password}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-slate-100"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {errors.general && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
          {errors.general}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-medium transition-colors"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {currentLang.redirecting}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            {currentLang.loginButton}
          </div>
        )}
      </Button>
    </form>
  )
}

// Register Component
interface RegisterProps {
  language: AuthLang
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

function RegisterForm({ language, isLoading, setIsLoading }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const currentLang = authI18n[language]

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      setLogoFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const restaurantName = formData.get("restaurantName") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const defaultLanguage = formData.get("defaultLanguage") as string

    const newErrors: Record<string, string> = {}

    if (!username || !restaurantName || !password || !confirmPassword || !defaultLanguage) {
      newErrors.general = currentLang.allFieldsRequired
    }

    if (email && !validateEmail(email)) {
      newErrors.email = currentLang.invalidEmail
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = currentLang.passwordMismatch
    }

    if (password && password.length < 6) {
      newErrors.password = currentLang.weakPassword
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          restaurant_name: restaurantName,
          email,
          password,
          language: defaultLanguage
        })
      })
      const result = await response.json()
      if (result.success) {
        // Redirect to admin dashboard after successful registration
        console.log('Auth: Registration successful, redirecting to admin dashboard')
        window.location.href = '/admin/dashboard'
      } else {
        setErrors({ general: result.error })
      }
    } catch (error) {
      console.log("[AUTH] Registration error:", error)
      setErrors({ general: "حدث خطأ أثناء إنشاء الحساب" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-slate-700">
            {currentLang.username} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="username"
            name="username"
            type="text"
            required
            className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
            placeholder={currentLang.username}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurantName" className="text-sm font-medium text-slate-700">
            {currentLang.restaurantName} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="restaurantName"
            name="restaurantName"
            type="text"
            required
            className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
            placeholder={currentLang.restaurantName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            {currentLang.email} <span className="text-slate-400">({currentLang.optional})</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
            placeholder={currentLang.email}
          />
          {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            {currentLang.password} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="h-11 pr-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              placeholder={currentLang.password}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-slate-100"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            {currentLang.confirmPassword} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              className="h-11 pr-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              placeholder={currentLang.confirmPassword}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-slate-100"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.confirmPassword && <p className="text-red-600 text-sm">{errors.confirmPassword}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultLanguage" className="text-sm font-medium text-slate-700">
            {currentLang.defaultLanguage} <span className="text-red-500">*</span>
          </Label>
          <Select name="defaultLanguage" defaultValue="ar">
            <SelectTrigger className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">{currentLang.arabic}</SelectItem>
              <SelectItem value="fr">{currentLang.french}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo" className="text-sm font-medium text-slate-700">
            {currentLang.restaurantLogo} <span className="text-slate-400">({currentLang.optional})</span>
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("logo")?.click()}
              className="flex items-center gap-2 h-11 border-slate-300 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              {logoFile ? logoFile.name : currentLang.chooseFile}
            </Button>
          </div>
          <p className="text-xs text-slate-500">{currentLang.pngJpgOnly}</p>
        </div>
      </div>

      {errors.general && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
          {errors.general}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-medium transition-colors"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {currentLang.redirecting}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            {currentLang.registerButton}
          </div>
        )}
      </Button>
    </form>
  )
}

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
    const newLang: AuthLang = language === "ar" ? "fr" : "ar"
    setLanguage(newLang)
    localStorage.setItem("admin-language", newLang)
  }

  const handleAuthSuccess = (role?: string) => {
    if (role === 'kitchen') router.replace('/kitchen')
    else if (role === 'waiter') router.replace('/waiter')
    else router.replace('/admin/dashboard')
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and System Name */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow text-white">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900">{currentLang.systemName}</h1>
                <p className="text-sm text-slate-600">{currentLang.systemDescription}</p>
              </div>
            </div>

            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLanguageToggle}
              className="flex items-center gap-2 hover:bg-slate-50 transition-colors border-slate-300"
            >
              <Globe className="h-4 w-4" />
              <span className="font-medium">{language === "ar" ? "FR" : "AR"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Left side - Welcome Content */}
          <div className="hidden md:flex flex-col justify-center space-y-6 px-4">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                {currentLang.welcomeHeadline}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                {currentLang.welcomeSub}
              </p>
            </div>
            
            <ul className="space-y-3">
              {currentLang.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 mt-0.5 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm flex flex-col items-center gap-2">
                <ChefHat className="h-6 w-6 text-slate-600" />
                <p className="text-xs font-medium text-slate-600 text-center">Kitchen</p>
              </div>
              <div className="p-4 rounded-xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm flex flex-col items-center gap-2">
                <Layers className="h-6 w-6 text-slate-600" />
                <p className="text-xs font-medium text-slate-600 text-center">Menus</p>
              </div>
              <div className="p-4 rounded-xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm flex flex-col items-center gap-2">
                <Users2 className="h-6 w-6 text-slate-600" />
                <p className="text-xs font-medium text-slate-600 text-center">Staff</p>
              </div>
            </div>
          </div>

          {/* Right side - Auth Forms */}
          <div className="max-w-md mx-auto w-full">
            <Tabs defaultValue="login" className="w-full">
              {/* Tabs Navigation */}
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-lg">
                <TabsTrigger
                  value="login"
                  className="rounded-md font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {currentLang.login}
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-md font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {currentLang.register}
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <Card className="shadow-lg border-slate-200 bg-white/95 backdrop-blur-sm">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                      <LogIn className="h-5 w-5" />
                      {currentLang.login}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {currentLang.systemDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LoginForm
                      onSuccess={handleAuthSuccess}
                      language={language}
                      isLoading={isLoading}
                      setIsLoading={setIsLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <Card className="shadow-lg border-slate-200 bg-white/95 backdrop-blur-sm">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      {currentLang.register}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {currentLang.systemDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RegisterForm
                      language={language}
                      isLoading={isLoading}
                      setIsLoading={setIsLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500 border-t border-slate-200 bg-white/50">
        © {new Date().getFullYear()} {currentLang.systemName} - {currentLang.systemDescription}
      </footer>
    </div>
  )
}