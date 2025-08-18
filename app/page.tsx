"use client"

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
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getLandingTexts } from "@/lib/i18n/landing"
import { useSession } from "@/hooks/use-session"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [language, setLanguage] = useState<"ar" | "fr">("ar")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Load saved language preference
    const savedLang = localStorage.getItem("landing-language") as "ar" | "fr"
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
    const newLang = language === "ar" ? "fr" : "ar"
    setLanguage(newLang)
    localStorage.setItem("landing-language", newLang)
  }

  const t = useMemo(()=> getLandingTexts(language), [language])

  if (!mounted) return null

  const features = [
    {
      icon: Settings,
      title: t.feature1Title,
      description: t.feature1Desc,
    },
    {
      icon: Globe,
      title: t.feature2Title,
      description: t.feature2Desc,
    },
    {
      icon: Smartphone,
      title: t.feature3Title,
      description: t.feature3Desc,
    },
    {
      icon: QrCode,
      title: t.feature4Title,
      description: t.feature4Desc,
    },
    {
      icon: Users,
      title: t.feature5Title,
      description: t.feature5Desc,
    },
    {
      icon: CheckCircle,
      title: t.feature6Title,
      description: t.feature6Desc,
    },
  ]

  const steps = [
    {
      number: "1",
      title: t.step1,
      description: t.step1Desc,
    },
    {
      number: "2",
      title: t.step2,
      description: t.step2Desc,
    },
    {
      number: "3",
      title: t.step3,
      description: t.step3Desc,
    },
    {
      number: "4",
      title: t.step4,
      description: t.step4Desc,
    },
  ]

  return (
    <div className={`min-h-screen bg-background ${language === "ar" ? "rtl" : "ltr"}`}>
      {/* Header */}
  <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <ChefHat className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">QrPlus</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#home" className="text-foreground hover:text-primary transition-colors">
                {t.home}
              </a>
              <a href="#features" className="text-foreground hover:text-primary transition-colors">
                {t.features}
              </a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors">
                {t.about}
              </a>
              <a href="#privacy" className="text-foreground hover:text-primary transition-colors">
                {t.privacy}
              </a>
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLanguageToggle}
                className="flex items-center gap-2 bg-transparent"
              >
                <Globe className="h-4 w-4" />
                <span>{language === "ar" ? "FR" : "AR"}</span>
              </Button>

              {/* Auth Buttons - Desktop */}
              {!user && (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/auth">
                    <Button variant="ghost" size="sm" disabled={sessionLoading}>
                      {t.login}
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="sm" disabled={sessionLoading}>{t.signupNow}</Button>
                  </Link>
                </div>
              )}
              {user && (
                <Link href="/admin/dashboard" className="hidden md:block">
                  <Button size="sm" variant="default" className="gap-2">
                    {t.continueDashboard}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-in-down">
              <nav className="flex flex-col gap-4">
                <a href="#home" className="text-foreground hover:text-primary transition-colors">
                  {t.home}
                </a>
                <a href="#features" className="text-foreground hover:text-primary transition-colors">
                  {t.features}
                </a>
                <a href="#about" className="text-foreground hover:text-primary transition-colors">
                  {t.about}
                </a>
                <a href="#privacy" className="text-foreground hover:text-primary transition-colors">
                  {t.privacy}
                </a>
                <div className="flex gap-2 pt-2">
                  <Link href="/auth">
                    <Button variant="ghost" size="sm" className="flex-1">
                      {t.login}
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="sm" className="flex-1">
                      {t.signupNow}
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {t.heroTitle}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">{t.heroSubtitle}</p>
              <p className="text-lg text-muted-foreground">{t.heroDescription}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                {!user && (
                  <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 hover-lift">
                      {t.startTrial}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {user && (
                  <Link href="/admin/dashboard">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-6 hover-lift gap-2">
                      {t.goDashboard}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="animate-fade-in-right">
              <div className="relative">
                <Image
                  src="/placeholder.jpg?height=500&width=600"
                  alt="QrPlus System Interface"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                  width={600}
                  height={500}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.featuresTitle}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="hover-lift animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
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
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-left">
              <Image
                src="/placeholder.jpg?height=400&width=500"
                alt="About QrPlus Team"
                className="w-full h-auto rounded-2xl shadow-lg"
                width={500}
                height={400}
              />
            </div>
            <div className="space-y-6 animate-fade-in-right">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.aboutTitle}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{t.aboutDescription}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t.privacyTitle}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{t.privacyDescription}</p>
            <Button variant="outline" size="lg">
              {t.readMore}
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">{t.ctaTitle}</h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">{t.ctaDescription}</p>
          {!user ? (
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover-lift">
                {t.startFreeTrialBtn}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href="/admin/dashboard">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover-lift gap-2">
                {t.continueDashboard}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Logo and Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg">
                  <ChefHat className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">QrPlus</span>
              </div>
              <p className="text-muted-foreground">
                {t.footerShort}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">{t.quickLinks}</h3>
              <div className="flex flex-col gap-2">
                <a href="#home" className="text-muted-foreground hover:text-primary transition-colors">
                  {t.home}
                </a>
                <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                  {t.features}
                </a>
                <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">
                  {t.about}
                </a>
                <a href="#privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t.privacy}
                </a>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">{t.followUs}</h3>
              <div className="flex gap-4">
                <Button variant="outline" size="sm">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Instagram className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground">{t.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
