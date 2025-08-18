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
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today')
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')

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
    try {
      const { from, to } = getDateRange(selectedPeriod)
      
      const response = await fetch('/api/orders', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      
      // Filter orders by date range
      const filteredOrders = data.data.filter((order: Order) => {
        if (!order.created_at) return false
        const orderDate = new Date(order.created_at)
        return orderDate >= new Date(from) && orderDate <= new Date(to)
      })
      
      setOrders(filteredOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, getDateRange])

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

  const getPeriodLabel = (period: TimePeriod) => {
    const labels = {
      today: language === 'ar' ? 'اليوم' : "Aujourd'hui",
      last3days: language === 'ar' ? 'آخر 3 أيام' : '3 derniers jours',
      lastweek: language === 'ar' ? 'الأسبوع الماضي' : 'Semaine dernière',
      lastmonth: language === 'ar' ? 'الشهر الماضي' : 'Mois dernier',
      custom: language === 'ar' ? 'مخصص' : 'Personnalisé'
    }
    return labels[period]
  }

  return (
    <AdminLayout>
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AdminHeader 
          title={language === 'ar' ? 'التحليلات' : 'Analytics'} 
          showBackButton={true}
          onBackClick={() => router.push('/admin/dashboard')}
        />
        
        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {language === 'ar' ? 'تحليلات الطلبات' : 'Analyses des Commandes'}
              </h1>
              <p className="text-slate-600 mt-1">
                {language === 'ar' ? 'عرض إحصائيات مفصلة عن الطلبات' : 'Statistiques détaillées des commandes'}
              </p>
            </div>
            <Button onClick={fetchOrders} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {language === 'ar' ? 'تحديث' : 'Actualiser'}
            </Button>
          </div>

          {/* Time Period Selector */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'الفترة الزمنية' : 'Période'}
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
                    className={selectedPeriod === period ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  >
                    {getPeriodLabel(period)}
                  </Button>
                ))}
              </div>
              
              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">
                      {language === 'ar' ? 'من تاريخ' : 'Date de début'}
                    </label>
                    <Input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">
                      {language === 'ar' ? 'إلى تاريخ' : 'Date de fin'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">
                      {language === 'ar' ? 'إجمالي الطلبات' : 'Total Commandes'}
                    </p>
                    <p className="text-3xl font-bold text-blue-900">
                      {analytics.totalOrders.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200/50 rounded-full">
                    <ShoppingBag className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">
                      {language === 'ar' ? 'إجمالي الإيرادات' : 'Revenus Total'}
                    </p>
                    <p className="text-3xl font-bold text-green-900">
                      {analytics.totalRevenue.toLocaleString()} {language === 'ar' ? 'دج' : 'DZD'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-200/50 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">
                      {language === 'ar' ? 'متوسط الطلب' : 'Commande Moyenne'}
                    </p>
                    <p className="text-3xl font-bold text-purple-900">
                      {analytics.averageOrderValue.toFixed(0)} {language === 'ar' ? 'دج' : 'DZD'}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-200/50 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 mb-1">
                      {language === 'ar' ? 'الطلبات المكتملة' : 'Commandes Servies'}
                    </p>
                    <p className="text-3xl font-bold text-orange-900">
                      {analytics.statusCounts.served || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200/50 rounded-full">
                    <Clock className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {language === 'ar' ? 'حالة الطلبات' : 'Statut des Commandes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                      <span className="font-semibold text-slate-700">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {language === 'ar' ? 'الإحصائيات اليومية' : 'Statistiques Quotidiennes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {analytics.dailyStats.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">
                      {language === 'ar' ? 'لا توجد بيانات للفترة المحددة' : 'Aucune donnée pour cette période'}
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
                            {day.revenue.toLocaleString()} {language === 'ar' ? 'دج' : 'DZD'}
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
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {language === 'ar' ? 'الطلبات الأخيرة' : 'Commandes Récentes'}
                </div>
                <Badge variant="secondary">{orders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-600">
                    {language === 'ar' ? 'جاري التحميل...' : 'Chargement...'}
                  </span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">
                    {language === 'ar' ? 'لا توجد طلبات في هذه الفترة' : 'Aucune commande pour cette période'}
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
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">
                          {order.total.toLocaleString()} {language === 'ar' ? 'دج' : 'DZD'}
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
                        {language === 'ar' ? `عرض 50 من أصل ${orders.length} طلب` : `Affichage de 50 sur ${orders.length} commandes`}
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
