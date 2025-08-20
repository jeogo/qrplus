export const analyticsTexts = {
  ar: {
    title: 'التحليلات',
    pageTitle: 'تحليلات الطلبات',
    pageSubtitle: 'عرض إحصائيات مفصلة عن الطلبات',
    refresh: 'تحديث',
    updatedAt: 'آخر تحديث',
    periods: {
      today: 'اليوم',
      last3days: 'آخر 3 أيام',
      lastweek: 'الأسبوع الماضي',
      lastmonth: 'الشهر الماضي',
      custom: 'مخصص'
    },
    dateFrom: 'من تاريخ',
    dateTo: 'إلى تاريخ',
    stats: {
      totalOrders: 'إجمالي الطلبات',
      totalRevenue: 'إجمالي الإيرادات',
      averageOrder: 'متوسط الطلب',
  servedOrders: 'الطلبات المكتملة',
  todayServed: 'المكتملة اليوم',
  todayRevenue: 'إيراد اليوم المكتمل',
  cancelled: 'الملغاة',
  avgServeTime: 'متوسط التقديم (د)'
    },
    currency: 'دج',
    statusBreakdown: 'حالة الطلبات',
    dailyStats: 'الإحصائيات اليومية',
    noDailyData: 'لا توجد بيانات للفترة المحددة',
    recentOrders: 'الطلبات الأخيرة',
    noOrdersPeriod: 'لا توجد طلبات في هذه الفترة',
    loading: 'جاري التحميل...',
    showingOf: (shown:number,total:number)=> `عرض ${shown} من أصل ${total} طلب` ,
    statuses: {
      pending: 'معلق',
      approved: 'مقبول',
      ready: 'جاهز',
      served: 'مكتمل',
      cancelled: 'ملغي'
    },
    toasts: {
      refreshed: 'تم تحديث البيانات',
      refreshError: 'فشل تحديث البيانات'
    },
    retry: 'إعادة المحاولة'
  },
  fr: {
    title: 'Analytique',
    pageTitle: 'Analyses des Commandes',
    pageSubtitle: 'Statistiques détaillées des commandes',
    refresh: 'Actualiser',
    updatedAt: 'Dernière mise à jour',
    periods: {
      today: "Aujourd'hui",
      last3days: '3 derniers jours',
      lastweek: 'Semaine dernière',
      lastmonth: 'Mois dernier',
      custom: 'Personnalisé'
    },
    dateFrom: 'Date de début',
    dateTo: 'Date de fin',
    stats: {
      totalOrders: 'Total Commandes',
      totalRevenue: 'Revenus Total',
      averageOrder: 'Commande Moyenne',
  servedOrders: 'Commandes Servies',
  todayServed: 'Servies Aujourd\'hui',
  todayRevenue: 'Recettes Servies Aujourd\'hui',
  cancelled: 'Annulées',
  avgServeTime: 'Temps Moyen Service (min)'
    },
    currency: 'DZD',
    statusBreakdown: 'Statut des Commandes',
    dailyStats: 'Statistiques Quotidiennes',
    noDailyData: 'Aucune donnée pour cette période',
    recentOrders: 'Commandes Récentes',
    noOrdersPeriod: 'Aucune commande pour cette période',
    loading: 'Chargement...',
    showingOf: (shown:number,total:number)=> `Affichage de ${shown} sur ${total} commandes`,
    statuses: {
      pending: 'En attente',
      approved: 'Approuvée',
      ready: 'Prête',
      served: 'Servie',
      cancelled: 'Annulée'
    },
    toasts: {
      refreshed: 'Données mises à jour',
      refreshError: "Échec de l'actualisation"
    },
    retry: 'Réessayer'
  }
}

export function getAnalyticsTexts(lang: 'ar'|'fr') { return analyticsTexts[lang] }
