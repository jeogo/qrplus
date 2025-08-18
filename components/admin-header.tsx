"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Globe, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useSession } from "@/hooks/use-session"

interface AdminHeaderProps {
  title: string
  showBackButton?: boolean
  onBackClick?: () => void
  backText?: string
}

export function AdminHeader({ title, showBackButton = false, onBackClick, backText }: AdminHeaderProps) {
  // Use shared language hook (no toggle here anymore)
  const language = useAdminLanguage()
  const [systemStatus, setSystemStatus] = useState<"online" | "offline">("online")
  const { user } = useSession()

  // Mock system status - in real app this would come from Supabase
  useEffect(() => {
    // Simulate system status check
    const checkSystemStatus = () => {
      // This would be a real API call to check system status
      setSystemStatus("online")
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const t = {
    ar: {
      dashboard: "لوحة التحكم",
      systemOnline: "النظام متصل",
      systemOffline: "النظام متوقف",
      back: "رجوع",
    },
    fr: {
      dashboard: "Tableau de Bord",
      systemOnline: "Système En Ligne",
      systemOffline: "Système Hors Ligne",
      back: "Retour",
    },
  }

  const currentLang = t[language]

  // (Language persistence & change now managed in settings page)

  return (
    <header className={`bg-card border-b border-border sticky top-0 z-50 ${language === "ar" ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Back Button + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="flex items-center gap-2 hover:bg-muted flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{backText || currentLang.back}</span>
              </Button>
            )}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">{title}</h1>
          </div>

          {/* Right Section - Status + Dashboard (language toggle removed) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* System Status - Hidden on small screens */}
            <Badge
              variant={systemStatus === "online" ? "default" : "destructive"}
              className="hidden md:flex items-center gap-1"
            >
              <div className={`w-2 h-2 rounded-full ${systemStatus === "online" ? "bg-green-500" : "bg-red-500"}`} />
              {systemStatus === "online" ? currentLang.systemOnline : currentLang.systemOffline}
            </Badge>

            {/* Dashboard/Home Link - Only show for admin */}
            {user?.role === 'admin' && (
              <Link href="/admin/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-muted bg-transparent min-h-[44px] min-w-[44px]"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">{currentLang.dashboard}</span>
                </Button>
              </Link>
            )}

            {/* Language indicator (optional) */}
            <div className="hidden md:flex items-center px-3 py-2 border rounded-md text-xs font-medium text-muted-foreground gap-1">
              <Globe className="h-4 w-4" />
              {language.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Mobile System Status */}
        <div className="md:hidden mt-2">
          <Badge
            variant={systemStatus === "online" ? "default" : "destructive"}
            className="flex items-center gap-1 w-fit"
          >
            <div className={`w-2 h-2 rounded-full ${systemStatus === "online" ? "bg-green-500" : "bg-red-500"}`} />
            {systemStatus === "online" ? currentLang.systemOnline : currentLang.systemOffline}
          </Badge>
        </div>
      </div>
    </header>
  )
}

// Hook to use language state across components
export function useAdminLanguage() {
  const [language, setLanguage] = useState<"ar" | "fr">("ar")
  useEffect(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem("admin-language") as "ar" | "fr" | null
    if (saved === "ar" || saved === "fr") setLanguage(saved)
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === "ar" || detail === "fr") setLanguage(detail)
    }
    window.addEventListener("languageChange", handler)
    return () => window.removeEventListener("languageChange", handler)
  }, [])
  return language
}
