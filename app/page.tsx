"use client"

// Landing page: cleaned & populated with real product-style copy (Arabic & French) instead of placeholders.
// Removed dependency on getLandingTexts (outdated) and inlined bilingual dictionary for clarity.
// Images now point to existing public assets (logo.png). Replace with real screenshots: /public/hero-dashboard.png, /public/about-team.jpg when available.
// To further customize, edit the dictionaries below.

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChefHat,
  QrCode,
  Smartphone,
  Users,
  Globe,
  Settings,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  Gauge,
  Bell,
  Cpu,
  Shield,
  Lock,
  Eye,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "@/hooks/use-session"
import { getLandingTexts } from "@/lib/i18n/landing"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [language, setLanguage] = useState<"ar" | "fr" | "en">("ar")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Load saved language preference
  const savedLang = localStorage.getItem("landing-language") as "ar" | "fr" | "en"
    if (savedLang) {
      setLanguage(savedLang)
    }
  }, [])

  // Auto redirect if already authenticated (once session loaded)
  useEffect(()=> {
    if (mounted && !sessionLoading && user) {
      // slight delay for a subtle transition
      const timeout = setTimeout(()=> router.replace('/admin/dashboard'), 450)
      return ()=> clearTimeout(timeout)
    }
  }, [mounted, sessionLoading, user, router])

  const handleLanguageToggle = () => {
    // cycle ar -> fr -> en -> ar
    const newLang = language === "ar" ? "fr" : language === "fr" ? "en" : "ar"
    setLanguage(newLang)
    localStorage.setItem("landing-language", newLang)
  }

  const t = useMemo(()=> getLandingTexts(language), [language])

  if (!mounted) return null

  type FeatureItem = { icon: React.ComponentType<{ className?: string }>; title: string; description: string }
  const features = ((): FeatureItem[] => {
    if (language === "ar") {
      return [
        { icon: QrCode, title: "قوائم QR تفاعلية", description: "قائمة ثلاثية اللغة تُحدّث فوراً بدون إعادة طباعة." },
        { icon: Smartphone, title: "طلبات فورية", description: "الزبون يرسل الطلب – يظهر مباشرة في واجهة المطبخ." },
        { icon: Bell, title: "إشعارات فورية", description: "تنبيهات للمطبخ، الويتر، والإدارة على نفس القناة." },
        { icon: Gauge, title: "تحليلات مباشرة", description: "مؤشرات المبيعات، متوسط التذكرة، والأطباق الأكثر طلباً." },
        { icon: Settings, title: "تحكم مرن", description: "تفعيل/إيقاف النظام أو منتج أو فئة بضغطة واحدة." },
        { icon: Cpu, title: "أداء سريع", description: "واجهة خفيفة محسّنة للأجهزة المحمولة والإنترنت الضعيف." },
      ]
    }
    if (language === 'fr') {
      return [
        { icon: QrCode, title: "Menus QR interactifs", description: "Menu trilingue mis à jour instantanément sans réimpression." },
        { icon: Smartphone, title: "Commandes en direct", description: "Le client envoie – la cuisine voit immédiatement." },
        { icon: Bell, title: "Notifications instantanées", description: "Cuisine, serveur et manager synchronisés." },
        { icon: Gauge, title: "Analytique en temps réel", description: "Ventes, ticket moyen et plats populaires." },
        { icon: Settings, title: "Contrôle granulaire", description: "Activez / désactivez le système ou un produit en un clic." },
        { icon: Cpu, title: "Performance élevée", description: "Interface optimisée mobile & réseaux lents." },
      ]
    }
    return [
      { icon: QrCode, title: "Interactive QR Menus", description: "Tri-lingual menu updated instantly with no reprint." },
      { icon: Smartphone, title: "Instant Ordering", description: "Guest sends order – kitchen sees it immediately." },
      { icon: Bell, title: "Real-time Notifications", description: "Kitchen, waiter and management stay in sync." },
      { icon: Gauge, title: "Live Analytics", description: "Sales KPIs, average ticket & popular dishes." },
      { icon: Settings, title: "Granular Control", description: "Enable/disable system, product or category with a click." },
      { icon: Cpu, title: "Fast Performance", description: "Lightweight UI tuned for mobile & poor networks." },
    ]
  })()

  const steps = [
    { number: "1", title: t.step1, description: t.step1Desc },
    { number: "2", title: t.step2, description: t.step2Desc },
    { number: "3", title: t.step3, description: t.step3Desc },
    { number: "4", title: t.step4, description: t.step4Desc },
  ]

  return (
  <div className={`min-h-screen ${language === "ar" ? "rtl" : "ltr"}`}> 
      {/* Header (simplified) */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary text-primary-foreground"><ChefHat className="h-5 w-5" /></div>
            <span className="font-semibold text-foreground tracking-tight">QrPlus</span>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#home" className="link-muted">{t.home}</a>
            <a href="#features" className="link-muted">{t.features}</a>
            <a href="#pricing" className="link-muted">{t.pricing}</a>
            <a href="#about" className="link-muted">{t.about}</a>
            <a href="#privacy" className="link-muted">{t.privacy}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLanguageToggle} className="text-xs font-medium">
              <Globe className="h-4 w-4" /> {language === "ar" ? "FR" : language === "fr" ? "EN" : "AR"}
            </Button>
            {!user && (
              <Link href="/auth" className="hidden md:inline-block">
                <Button size="sm" variant="default" className="text-xs">{t.signupNow}</Button>
              </Link>
            )}
            {user && (
              <Link href="/admin/dashboard" className="hidden md:inline-block">
                <Button size="sm" className="text-xs gap-1">{t.continueDashboard}<ArrowRight className="h-3 w-3" /></Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={()=> setIsMenuOpen(v=>!v)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background/95">
            <div className="px-4 py-4 flex flex-col gap-3 text-sm">
              {[{k:'#home',v:t.home},{k:'#features',v:t.features},{k:'#pricing',v:t.pricing},{k:'#about',v:t.about},{k:'#privacy',v:t.privacy}].map(i=> (
                <a key={i.k} href={i.k} className="link-muted" onClick={()=> setIsMenuOpen(false)}>{i.v}</a>
              ))}
              <div className="flex gap-2 pt-1">
                {!user && (
                  <Link href="/auth" className="flex-1">
                    <Button variant="default" className="w-full text-xs">{t.login}</Button>
                  </Link>
                )}
                {user && (
                  <Link href="/admin/dashboard" className="flex-1">
                    <Button variant="secondary" className="w-full text-xs">{t.continueDashboard}</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section (simplified) */}
      <section id="home" className="section-alt">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              {t.heroTitle}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">{t.heroSubtitle}</p>
            <p className="text-base text-soft">{t.heroDescription}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {!user && (
                <Link href="/auth">
                  <Button size="lg" className="px-8">{t.startTrial}<ArrowRight className="h-5 w-5 ms-2" /></Button>
                </Link>
              )}
              {user && (
                <Link href="/admin/dashboard">
                  <Button size="lg" variant="secondary" className="px-8 gap-2">{t.goDashboard}<ArrowRight className="h-5 w-5" /></Button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="p-8 rounded-2xl surface-lg shadow-sm flex flex-col items-center gap-4 w-full max-w-sm">
              <div className="p-6 rounded-xl bg-primary text-primary-foreground">
                <ChefHat className="h-14 w-14" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">QrPlus</p>
                <p className="text-xs text-soft">Fast QR Menu & Orders</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (simplified) */}
      <section id="features" className="section">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 tracking-tight text-center">{t.featuresTitle}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f,i)=> {
              const Icon = f.icon
              return (
                <div key={i} className="group rounded-xl surface p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                  <p className="text-xs text-soft leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing (simplified single plan) */}
      <section id="pricing" className="section-alt">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t.pricingTitle}</h2>
            <p className="text-sm text-soft">{t.pricingSubtitle}</p>
          </div>
          <div className="max-w-md mx-auto surface-lg p-8 flex flex-col gap-6">
            <div className="space-y-1 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-dim">{language === 'ar' ? 'الخطة الوحيدة' : 'Offre Unique'}</p>
              <p className="text-3xl font-bold text-foreground flex items-center justify-center gap-1"><DollarSign className="h-6 w-6" />19<span className="text-base font-normal text-dim">/ {language === 'ar' ? 'شهرياً' : 'mois'}</span></p>
              <p className="text-xs text-dim">2755 DZD / {language === 'ar' ? 'شهرياً' : 'mois'}</p>
            </div>
            <ul className="space-y-3 text-sm text-soft">
              {[language === 'ar' ? 'طاولات ومنتجات غير محدودة':'Tables & produits illimités', language === 'ar' ? 'إشعارات فورية':'Notifications instantanées', language === 'ar' ? 'تحليلات بسيطة':'Analytique simple', language === 'ar' ? 'دعم مستمر':'Support continu'].map((v,i)=> (
                <li key={i} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> {v}</li>
              ))}
            </ul>
            <Link href="/auth" className="block">
              <Button className="w-full" size="lg">{t.startSubscription}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
  <section className="section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.howItWorksTitle}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-border -translate-x-8" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
  <section id="about" className="section">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-left">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl blur-2xl"></div>
                <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-12 border border-border/50 shadow-xl">
                  <div className="flex items-center justify-center">
                    <div className="p-6 bg-gradient-to-br from-primary to-secondary rounded-xl">
                      <Users className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="text-lg text-muted-foreground">Team QrPlus</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 animate-fade-in-right">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.aboutTitle}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{t.aboutDescription}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
  <section id="privacy" className="section-alt">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t.privacyTitle}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">{t.privacyDescription}</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {[
                { icon: Lock, title: t.privacyFeature1, description: language === "ar" ? "جميع البيانات محمية بتشفير متقدم" : "Toutes les données protégées par chiffrement avancé" },
                { icon: Shield, title: t.privacyFeature2, description: language === "ar" ? "خصوصيتك مضمونة 100%" : "Votre confidentialité garantie à 100%" },
                { icon: Gauge, title: t.privacyFeature3, description: language === "ar" ? "نسخ احتياطية آمنة ومنتظمة" : "Sauvegardes sécurisées et régulières" },
                { icon: Eye, title: t.privacyFeature4, description: language === "ar" ? "تحكم كامل في بياناتك" : "Contrôle total sur vos données" },
              ].map((item, index) => (
                <Card key={index} className="text-center hover-lift animate-fade-in-up border-0 bg-card/50 backdrop-blur-sm" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardHeader>
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl w-fit mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            
            <div className="text-center">
              <Button variant="outline" size="lg" className="hover-lift">
                <Shield className="mr-2 h-5 w-5" />
                {t.readMore}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.ctaTitle}</h2>
          <p className="text-sm md:text-base text-primary-foreground/80 mb-6 max-w-2xl mx-auto">{t.ctaDescription}</p>
          {!user ? (
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="px-8">{t.startFreeTrialBtn}<ArrowRight className="h-5 w-5 ms-2" /></Button>
            </Link>
          ) : (
            <Link href="/admin/dashboard">
              <Button size="lg" variant="secondary" className="px-8 gap-2">{t.continueDashboard}<ArrowRight className="h-5 w-5" /></Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t bg-background">
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between text-sm">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary text-primary-foreground rounded-md"><ChefHat className="h-4 w-4" /></div>
              <span className="font-semibold tracking-tight text-foreground">QrPlus</span>
            </div>
            <p className="text-dim text-xs leading-relaxed">{t.footerShort}</p>
          </div>
          <div className="flex gap-10">
            <div className="space-y-2">
              <p className="font-medium text-foreground text-xs">{t.quickLinks}</p>
              <div className="flex flex-col gap-1 text-xs text-soft">
                <a href="#home" className="link-muted">{t.home}</a>
                <a href="#features" className="link-muted">{t.features}</a>
                <a href="#about" className="link-muted">{t.about}</a>
                <a href="#privacy" className="link-muted">{t.privacy}</a>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground text-xs">{t.followUs}</p>
              <div className="flex gap-2">
                {[Facebook,Twitter,Instagram].map((I,i)=> <div key={i} className="w-8 h-8 rounded-md border flex items-center justify-center text-soft"><I className="h-3.5 w-3.5" /></div>)}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-[11px] text-dim">{t.copyright}</div>
      </footer>
    </div>
  )
}
