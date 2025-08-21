"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, ChefHat, Table, Users, ClipboardList, Settings } from "lucide-react"
import { useAdminLanguage } from "./admin-header"
import { SystemInactiveBanner } from "./system-inactive-banner"

interface NavItem {
  id: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  labelAr: string
  labelFr: string
  labelEn: string
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    href: "/admin/dashboard",
    icon: Home,
  labelAr: "الرئيسية",
  labelFr: "Accueil",
  labelEn: "Home",
  },
  {
    id: "menu",
    href: "/admin/menu",
    icon: ChefHat,
  labelAr: "القائمة",
  labelFr: "Menu",
  labelEn: "Menu",
  },
  {
    id: "tables",
    href: "/admin/tables",
    icon: Table,
  labelAr: "الطاولات",
  labelFr: "Tables",
  labelEn: "Tables",
  },
  {
    id: "users",
    href: "/admin/users",
    icon: Users,
  labelAr: "المستخدمين",
  labelFr: "Utilisateurs",
  labelEn: "Users",
  },
  {
    id: "orders",
    href: "/admin/orders",
    icon: ClipboardList,
  labelAr: "الطلبات",
  labelFr: "Commandes",
  labelEn: "Orders",
  },
  {
    id: "settings",
    href: "/admin/settings",
    icon: Settings,
  labelAr: "الإعدادات",
  labelFr: "Paramètres",
  labelEn: "Settings",
  },
]

export function AdminBottomNav() {
  const pathname = usePathname()
  const language = useAdminLanguage()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const getActiveItem = () => {
    if (pathname === "/admin/dashboard") return "dashboard"
    if (pathname === "/admin/menu") return "menu"
    if (pathname === "/admin/tables") return "tables"
    if (pathname === "/admin/users") return "users"
    if (pathname === "/admin/orders") return "orders"
    if (pathname === "/admin/settings") return "settings"
    return "dashboard"
  }

  const activeItem = getActiveItem()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-area-pb">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            const label = language === "ar" ? item.labelAr : language === 'fr' ? item.labelFr : item.labelEn

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg
                  transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                  active:scale-95 touch-manipulation
                `}
              >
                <div
                  className={`
                  p-1.5 rounded-full transition-all duration-200
                  ${isActive ? "bg-primary/20" : ""}
                `}
                >
                  <Icon
                    className={`
                    h-5 w-5 transition-all duration-200
                    ${isActive ? "scale-110" : ""}
                  `}
                  />
                </div>
                <span
                  className={`
                  text-xs font-medium mt-1 truncate max-w-full
                  transition-all duration-200
                  ${isActive ? "text-primary" : ""}
                `}
                >
                  {label}
                </span>

                {/* Active indicator dot */}
                {isActive && <div className="w-1 h-1 bg-primary rounded-full mt-0.5 animate-pulse" />}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// Layout wrapper component that includes bottom navigation
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const language = useAdminLanguage()

  return (
    <div className={`min-h-screen bg-background pb-20 ${language === "ar" ? "rtl" : "ltr"}`}>
  <SystemInactiveBanner />
      {children}
      <AdminBottomNav />
    </div>
  )
}
