"use client"
import { useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { sendPasswordResetEmail } from 'firebase/auth'
import { authI18n, AuthLang } from '@/lib/i18n/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Mail } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<AuthLang>(() => (typeof window !== 'undefined' ? (localStorage.getItem('admin-language') as AuthLang) || 'ar' : 'ar'))
  const t = authI18n[lang]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null); setError(null)
    if (!email) { setError(t.requiredEmail); return }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setMessage(t.successSent)
    } catch (e: any) {
      const code: string | undefined = e?.code
      if (code === 'auth/invalid-email') setError(t.invalidEmail)
      else if (code === 'auth/user-not-found') setError(t.userNotFound)
      else if (code === 'auth/too-many-requests') setError(t.tooManyAttempts)
      else setError(t.genericError)
    } finally { setLoading(false) }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Mail className="h-5 w-5 text-slate-600" />
            {t.resetPassword}
          </CardTitle>
          <p className="text-sm text-slate-600 leading-relaxed">{t.resetPasswordDescription}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                value={email}
                placeholder={t.email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
            {error && <div className="text-sm bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded">{error}</div>}
            {message && <div className="text-sm bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">{message}</div>}
            <Button type="submit" disabled={loading} className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-medium">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> <span>{t.redirecting}</span></> : t.sendLink}
            </Button>
            <p className="text-xs text-slate-500 text-center leading-relaxed">{t.checkSpamNote}</p>
            <div className="text-center">
              <a href="/auth" className="text-sm text-slate-600 hover:text-slate-800 underline underline-offset-4">{t.backToLogin}</a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
