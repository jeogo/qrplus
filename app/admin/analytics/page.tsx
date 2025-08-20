"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AdminHeader, useAdminLanguage } from '@/components/admin-header'
import { AdminLayout } from '@/components/admin-bottom-nav'
import { Calendar, RefreshCw, BarChart3, TrendingUp, ShoppingBag, Clock, DollarSign, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAnalyticsTexts } from '@/lib/i18n/analytics'

interface Order {
  id: number
  table_id: number
  status: string
  total: number
  created_at: string
  daily_number?: number
}

type TimePeriod = 'today' | 'last3days' | 'lastweek' | 'lastmonth' | 'custom'

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const language = useAdminLanguage()
  const t = useMemo(()=> getAnalyticsTexts(language), [language])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today')
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Get date range based on selected period
  const getDateRange = useCallback((period: TimePeriod) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (period) {
      case 'today':
        return {
          from: today.toISOString(),
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        }
      case 'last3days':
        const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
        return {
          from: threeDaysAgo.toISOString(),
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        }
      case 'lastweek':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        return {
          from: weekAgo.toISOString(),
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        }
      case 'lastmonth':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        return {
          from: monthAgo.toISOString(),
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        }
      case 'custom':
        return {
          from: customFromDate ? new Date(customFromDate).toISOString() : today.toISOString(),
          to: customToDate ? new Date(customToDate + 'T23:59:59').toISOString() : new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        }
      default:
        return { from: today.toISOString(), to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() }
    }
  }, [customFromDate, customToDate])

  // Fetch orders data
  const fetchOrders = useCallback(async () => {
    setLoading(true)
  setFetchError(null)
    try {
      const { from, to } = getDateRange(selectedPeriod)
      const controller = new AbortController()
      const timeout = setTimeout(()=> controller.abort(), 15000)
      const response = await fetch('/api/orders', { cache: 'no-store', signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) throw new Error('failed')
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'failed')
      const filteredOrders = data.data.filter((order: Order) => {
        if (!order.created_at) return false
        const orderDate = new Date(order.created_at)
        return orderDate >= new Date(from) && orderDate <= new Date(to)
      })
      setOrders(filteredOrders)
      setUpdatedAt(new Date().toLocaleTimeString())
      toast.success(t.toasts.refreshed)
    } catch (e) {
      console.error('[analytics] fetch failed', e)
      setOrders([])
  setFetchError('failed')
      toast.error(t.toasts.refreshError)
    } finally { setLoading(false) }
  }, [selectedPeriod, getDateRange, t])

  // Load data when period changes
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Status breakdown
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Daily breakdown for charts
    const dailyStats = orders.reduce((acc, order) => {
      if (!order.created_at) return acc
      const date = new Date(order.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { orders: 0, revenue: 0 }
      }
      acc[date].orders += 1
      acc[date].revenue += order.total || 0
      return acc
    }, {} as Record<string, { orders: number; revenue: number }>)

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusCounts,
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
  }, [orders])

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      served: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getPeriodLabel = (period: TimePeriod) => t.periods[period]

  return (
    <AdminLayout>
      <div className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AdminHeader 
          title={t.title} 
          showBackButton={true}
          onBackClick={() => router.push('/admin/dashboard')}
        />
        
        <main className="container mx-auto px-4 py-6 space-y-6">
          {fetchError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {t.toasts.refreshError}
            </div>
          )}
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t.pageTitle}</h1>
              <p className="text-muted-foreground mt-1">{t.pageSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={fetchOrders} disabled={loading} variant="secondary" className="flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t.refresh}
              </Button>
              {updatedAt && (
                <div className="text-xs bg-muted/60 text-muted-foreground px-3 py-1 rounded-full">
                  {t.updatedAt}: {updatedAt}
                </div>
              )}
            </div>
          </div>

          {/* Time Period Selector */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {(['today', 'last3days', 'lastweek', 'lastmonth', 'custom'] as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    className={selectedPeriod === period ? 'bg-primary text-primary-foreground' : ''}
                  >
                    {getPeriodLabel(period)}
                  </Button>
                ))}
              </div>
              
              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t.dateFrom}
                    </label>
                    <Input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t.dateTo}
                    </label>
                    <Input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border border-border/60 shadow-soft bg-gradient-to-br from-background to-muted/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                      {t.stats.totalOrders}
                    </p>
                    <p className="text-3xl font-bold tabular-nums">
                      {analytics.totalOrders.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/60 shadow-soft bg-gradient-to-br from-background to-muted/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                      {t.stats.totalRevenue}
                    </p>
                    <p className="text-3xl font-bold tabular-nums">
                      {analytics.totalRevenue.toLocaleString()} {t.currency}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/60 shadow-soft bg-gradient-to-br from-background to-muted/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                      {t.stats.averageOrder}
                    </p>
                    <p className="text-3xl font-bold tabular-nums">
                      {analytics.averageOrderValue.toFixed(0)} {t.currency}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/60 shadow-soft bg-gradient-to-br from-background to-muted/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                      {t.stats.servedOrders}
                    </p>
                    <p className="text-3xl font-bold tabular-nums">
                      {analytics.statusCounts.served || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t.statusBreakdown}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(status)}>
                          {t.statuses[status as keyof typeof t.statuses] || status}
                        </Badge>
                      </div>
                      <span className="font-semibold text-slate-700">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown */}
    <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
      {t.dailyStats}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {analytics.dailyStats.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">
          {t.noDailyData}
                    </p>
                  ) : (
                    analytics.dailyStats.map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-800">
                            {new Date(day.date).toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR')}
                          </p>
                          <p className="text-sm text-slate-600">
            {day.orders} {language === 'ar' ? 'طلبات' : 'commandes'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">
            {day.revenue.toLocaleString()} {t.currency}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {t.recentOrders}
                </div>
                <Badge variant="secondary">{orders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-600">
                    {t.loading}
                  </span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">
                    {t.noOrdersPeriod}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.slice(0, 50).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="font-medium text-slate-800">
                          #{order.daily_number || order.id}
                        </div>
                        <div className="text-sm text-slate-600">
                          {language === 'ar' ? 'طاولة' : 'Table'} {order.table_id}
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {t.statuses[order.status as keyof typeof t.statuses] || order.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">
                          {order.total.toLocaleString()} {t.currency}
                        </div>
                        <div className="text-sm text-slate-500">
                          {new Date(order.created_at).toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.length > 50 && (
                    <div className="text-center py-4 border-t">
                      <p className="text-sm text-slate-500">
                        {language==='ar' ? t.showingOf(50, orders.length) : t.showingOf(50, orders.length)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AdminLayout>
  )
}
