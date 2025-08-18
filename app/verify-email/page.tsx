"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, MailCheck, RefreshCw } from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { useAdminLanguage } from '@/components/admin-header'
import { auth } from '@/lib/firebase/config'
import { sendEmailVerification } from 'firebase/auth'

export default function VerifyEmailPage() {
  const { user, loading } = useSession()
  const language = useAdminLanguage()
  const router = useRouter()
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const t = (key: string) => {
    const ar: Record<string,string> = {
      title: 'تفعيل البريد الإلكتروني',
      subtitle: 'لقد أرسلنا رسالة تفعيل إلى بريدك. الرجاء فتح البريد والنقر على رابط التفعيل خلال 24 ساعة.',
      notVerified: 'لم يتم التفعيل بعد',
      resend: 'إعادة إرسال',
      resendIn: 'إعادة الإرسال بعد {s}ث',
      sent: 'تم إرسال البريد',
      check: 'فتحت البريد وتم التفعيل',
      refreshing: 'جارٍ التحقق...',
      backLogin: 'العودة',
      needEmail: 'لا يوجد بريد صالح لهذا الحساب.',
      verifiedRedirect: 'تم التفعيل بنجاح... إعادة التوجيه',
    }
    const fr: Record<string,string> = {
      title: 'Vérification de l’email',
      subtitle: 'Nous avons envoyé un email de vérification. Veuillez cliquer sur le lien dans les 24 heures.',
      notVerified: 'Pas encore vérifié',
      resend: 'Renvoyer',
      resendIn: 'Renvoyer dans {s}s',
      sent: 'Email envoyé',
      check: "J'ai vérifié mon email",
      refreshing: 'Vérification...',
      backLogin: 'Retour',
      needEmail: 'Aucun email valide pour ce compte.',
      verifiedRedirect: 'Vérifié. Redirection...',
    }
    return (language === 'ar' ? ar : fr)[key] || key
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  useEffect(() => {
    if (!loading && user && (user as { emailVerified?: boolean }).emailVerified) {
      router.replace('/admin/dashboard')
    }
  }, [user, loading, router])

  const handleResend = async () => {
    if (cooldown > 0 || sending) return
    if (!auth.currentUser) return
    try {
      setSending(true)
      await sendEmailVerification(auth.currentUser, { url: window.location.origin + '/verify-email' })
      setStatusMsg(t('sent'))
      setCooldown(60)
    } catch (e) {
      console.error('[VERIFY] resend failed', e)
      setStatusMsg('Error')
    } finally { setSending(false) }
  }

  const handleCheck = async () => {
    if (!auth.currentUser) return
    try {
      setSending(true)
      await auth.currentUser.reload()
      if (auth.currentUser.emailVerified) {
        // Mark backend then refresh token
        try { await fetch('/api/auth/mark-email-verified', { method: 'POST' }) } catch {/* ignore */}
        try { await fetch('/api/auth/refresh-email-verified', { method: 'POST' }) } catch {/* ignore */}
        setStatusMsg(t('verifiedRedirect'))
        setTimeout(() => router.replace('/admin/dashboard'), 1200)
      } else {
        setStatusMsg(t('notVerified'))
      }
    } finally { setSending(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        {t('refreshing')}
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 ${language === 'ar' ? 'rtl' : 'ltr'}`}>      
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <MailCheck className="h-5 w-5 text-blue-600" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('subtitle')}<br/>
            {user?.email ? <span className="font-medium text-slate-800">{user.email}</span> : <span className="text-red-500">{t('needEmail')}</span>}
          </p>
          {statusMsg && <div className="text-xs bg-slate-100 px-3 py-2 rounded border border-slate-200 text-slate-700">{statusMsg}</div>}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleResend} disabled={sending || cooldown>0} variant="outline" className="flex-1">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                cooldown>0 ? t('resendIn').replace('{s}', String(cooldown)) : t('resend')
              )}
            </Button>
            <Button onClick={handleCheck} disabled={sending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('check')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
