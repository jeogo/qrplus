"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, Users, QrCode, Settings, ClipboardList, Table, Package, UserCheck, BarChart3, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useMemo, useCallback } from "react"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { useSession } from "@/hooks/use-session"
import { getAdminDashboardTexts } from "@/lib/i18n/admin-dashboard"

interface DashboardStats { totalTables: number; totalProducts: number; totalUsers: number; totalOrders: number; pendingOrders: number }

export default function AdminDashboard() {
  const language = useAdminLanguage()
  const { user, loading: sessionLoading } = useSession()
  const [stats, setStats] = useState<DashboardStats>({ totalTables:0, totalProducts:0, totalUsers:0, totalOrders:0, pendingOrders:0 })
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const t = useMemo(()=> getAdminDashboardTexts(language), [language])
  const navigationCards = useMemo(()=> ([
    { title: t.menuManagement, description: t.menuDescription, icon: ChefHat, href: "/admin/menu" },
    { title: t.tablesManagement, description: t.tablesDescription, icon: QrCode, href: "/admin/tables" },
    { title: t.usersManagement, description: t.usersDescription, icon: Users, href: "/admin/users" },
    { title: t.settingsManagement, description: t.settingsDescription, icon: Settings, href: "/admin/settings" },
    { title: t.ordersManagement, description: t.ordersDescription, icon: ClipboardList, href: "/admin/orders" },
    { title: t.analyticsManagement, description: t.analyticsDescription, icon: BarChart3, href: "/admin/analytics" },
  ]), [t])

  const fetchStats = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(()=> controller.abort(), 12000)
      const endpoints = [
        ['/api/tables','totalTables'],
        ['/api/products','totalProducts'],
        ['/api/admin/users','totalUsers'],
        ['/api/orders','totalOrders'],
        ['/api/orders?status=pending','pendingOrders']
      ] as const
      const responses = await Promise.allSettled(endpoints.map(e=> fetch(e[0], { cache:'no-store', signal: controller.signal })))
      clearTimeout(timeout)
      const counts: DashboardStats = { totalTables:0,totalProducts:0,totalUsers:0,totalOrders:0,pendingOrders:0 }
      for (let i=0;i<responses.length;i++) {
        const ep = endpoints[i][1]
        const r = responses[i]
        if (r.status === 'fulfilled') {
          try {
            const j = await r.value.json()
            if (Array.isArray(j.data)) {
              (counts as unknown as Record<string, number>)[ep] = j.data.length
            }
          } catch {/* ignore individual parse */}
        } else {
          console.warn('[dashboard] endpoint failed:', endpoints[i][0], r.reason)
        }
      }
      setStats(counts)
      setUpdatedAt(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('dashboard stats load failed', e)
      setError('load_failed')
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (!sessionLoading && user) void fetchStats() }, [sessionLoading, user, fetchStats])

  // Redirect if no session after load
  useEffect(()=> { if (!sessionLoading && !user) { window.location.href = '/auth' } }, [sessionLoading, user])

  // Safety timeout to escape perpetual loading
  useEffect(()=> {
    if (!loading) return
    const id = setTimeout(()=> { if (loading) { setLoading(false); if (!error) setError('timeout') } }, 15000)
    return ()=> clearTimeout(id)
  }, [loading, error])

  if (!mounted || sessionLoading) return null

  if (loading) {
    return (
      <AdminLayout>
        <AdminHeader title={t.title} />
        <main className="container mx-auto px-4 py-6">
          <div className="grid gap-6">
            <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({length:5}).map((_,i)=> (
                <div key={i} className="h-32 rounded-xl bg-muted/40" />
              ))}
            </div>
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({length:3}).map((_,i)=> (
                <div key={i} className="h-48 rounded-xl bg-muted/40" />
              ))}
            </div>
            <p className="text-center text-muted-foreground text-sm mt-6">{t.loading}</p>
          </div>
        </main>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <AdminHeader title={t.title} />
        <main className="container mx-auto px-4 py-10 flex flex-col items-center gap-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-semibold">{language==='ar' ? 'حدث خطأ أثناء تحميل البيانات' : 'Failed to load dashboard data'}</h2>
            <p className="text-muted-foreground text-sm">
              {error === 'timeout' ? (language==='ar' ? 'انتهت المهلة. تحقق من الاتصال أو أعد المحاولة.' : 'Request timed out. Check connection and retry.') : (language==='ar' ? 'تحقق من الاتصال أو أعد المحاولة.' : 'Please check your connection and try again.')}
            </p>
            <Button onClick={fetchStats} variant="secondary">{language==='ar' ? 'إعادة المحاولة' : 'Retry'}</Button>
          </div>
        </main>
      </AdminLayout>
    )
  }

  const statisticsCards = [
    {
      title: t.totalTables,
      value: stats.totalTables,
      unit: t.tablesCount,
      icon: Table,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/admin/tables",
    },
    {
      title: t.totalProducts,
      value: stats.totalProducts,
      unit: t.productsCount,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/admin/menu",
    },
    {
      title: t.totalUsers,
      value: stats.totalUsers,
      unit: t.usersCount,
      icon: UserCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/admin/users",
    },
    {
      title: t.totalOrders,
      value: stats.totalOrders,
      unit: t.ordersCount,
      icon: ClipboardList,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/admin/orders",
    },
    {
      title: t.pendingOrders,
      value: stats.pendingOrders,
      unit: t.ordersCount,
      icon: ClipboardList,
      color: "text-red-600",
      bgColor: "bg-red-50",
      href: "/admin/orders?status=pending",
    },
  ]

  return (
    <AdminLayout>
      <AdminHeader 
        title={t.title} 
        showBackButton={false}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/analytics">
              <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-primary/5">
                <BarChart3 className="h-4 w-4" /> 
                {t.analytics}
              </Button>
            </Link>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={fetchStats} 
              disabled={loading} 
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 
              {t.refresh}
            </Button>
            {updatedAt && (
              <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {t.lastUpdated}: {updatedAt}
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {statisticsCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Link key={index} href={stat.href}>
                  <Card className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground/70 transition-colors">{stat.title}</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.unit}</p>
                          </div>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            {t.quickActions}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {navigationCards.map((card, index) => {
              const Icon = card.icon
              return (
                <Card key={index} className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">{card.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground/60 transition-colors">{card.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={card.href}>
                      <Button className="w-full group-hover:bg-primary/90 transition-colors" size="sm">
                        {t.goTo}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      </main>
    </AdminLayout>
  )
}
