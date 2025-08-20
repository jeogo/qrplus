// Shared translations for Admin Orders page (Arabic / French only)
export type AdminLang = 'ar' | 'fr'

interface OrdersTranslations {
  title: string
  all: string
  notifications: string
  browserNotifications: string
  audioNotifications: string
  grantPermission: string
  permissionDenied: string
  loading: string
  noOrders: string
  order: string
  table: string
  delete: string
  close: string
  total: string
  settingsTitle: string
  settingsDesc: string
  testAudio: string
  orderDeleted: string
  orderDeleteFailed: string
  confirmDelete: string
  volume: string
  refresh: string
  customerNote: string
  noItems: string
  orderDetails: string
  createdAt: string
  updatedAt: string
  manageOrders: string
  filterByStatus: string
  updateOrderProgress: string
  updateOrderSuccess: string
  actionFailed: string
  archiveOrderProgress: string
  archiveOrderSuccess: string
  archiveOrderFailed: string
  statusUpdateFailed: string
  deleteOrderFailed: string
  status: {
    pending: string
    approved: string
    ready: string
    served: string
  }
  viewModes?: {
    cards: string
    list: string
    compact: string
  }
  itemsLabel?: string
}

export const adminOrdersTexts: Record<AdminLang, OrdersTranslations> = {
  ar: {
    title: 'الطلبات',
    all: 'الكل',
    notifications: 'الإشعارات',
    browserNotifications: 'إشعارات المتصفح',
    audioNotifications: 'إشعارات صوتية',
    grantPermission: 'السماح بالإشعارات',
    permissionDenied: 'تم رفض الإشعارات، فعّلها من إعدادات المتصفح',
    loading: 'جار التحميل...',
    noOrders: 'لا توجد طلبات',
    order: 'طلب',
    table: 'طاولة',
    delete: 'حذف',
    close: 'إغلاق',
    total: 'الإجمالي',
    settingsTitle: 'إعدادات الإشعارات',
    settingsDesc: 'اضبط الإشعارات الصوتية وإشعارات المتصفح للتحديثات الفورية',
    testAudio: 'اختبار الصوت',
    orderDeleted: 'تم حذف الطلب',
    orderDeleteFailed: 'فشل حذف الطلب',
    confirmDelete: 'حذف هذا الطلب؟',
    volume: 'مستوى الصوت',
    refresh: 'تحديث',
    customerNote: 'ملاحظة الزبون',
    noItems: 'لا توجد عناصر',
    orderDetails: 'تفاصيل الطلب',
    createdAt: 'تم الإنشاء',
    updatedAt: 'آخر تحديث',
    manageOrders: 'إدارة الطلبات',
    filterByStatus: 'تصفية حسب الحالة',
    updateOrderProgress: 'تحديث الطلب...',
    updateOrderSuccess: 'تم التحديث',
    actionFailed: 'فشل العملية',
    archiveOrderProgress: 'أرشفة الطلب...',
    archiveOrderSuccess: 'تمت الأرشفة',
    archiveOrderFailed: 'فشل الأرشفة',
    statusUpdateFailed: 'فشل تحديث حالة الطلب',
    deleteOrderFailed: 'فشل حذف الطلب',
    status: {
      pending: 'قيد الانتظار',
      approved: 'مقبول',
      ready: 'جاهز',
      served: 'مُقدَّم'
  },
  viewModes: { cards: 'بطاقات', list: 'قائمة', compact: 'مضغوط' },
  itemsLabel: 'العناصر'
  },
  fr: {
    title: 'Commandes',
    all: 'Tous',
    notifications: 'Notifications',
    browserNotifications: 'Notifications Navigateur',
    audioNotifications: 'Notifications Audio',
    grantPermission: 'Autoriser les notifications',
    permissionDenied: 'Permission refusée, activez-la dans le navigateur',
    loading: 'Chargement...',
    noOrders: 'Aucune commande',
    order: 'Commande',
    table: 'Table',
    delete: 'Supprimer',
    close: 'Fermer',
    total: 'Total',
    settingsTitle: 'Paramètres des Notifications',
    settingsDesc: 'Configurez les notifications audio et navigateur pour les mises à jour en temps réel',
    testAudio: 'Tester l\'audio',
    orderDeleted: 'Commande supprimée',
    orderDeleteFailed: 'Échec de suppression',
    confirmDelete: 'Supprimer cette commande ?',
    volume: 'Volume',
    refresh: 'Actualiser',
    customerNote: 'Note client',
    noItems: 'Aucun article',
    orderDetails: 'Détails de la commande',
    createdAt: 'Créé le',
    updatedAt: 'Mis à jour le',
    manageOrders: 'Gestion des commandes',
    filterByStatus: 'Filtrer par statut',
    updateOrderProgress: 'Mise à jour...',
    updateOrderSuccess: 'Mis à jour',
    actionFailed: 'Échec',
    archiveOrderProgress: 'Archivage...',
    archiveOrderSuccess: 'Archivé',
    archiveOrderFailed: 'Échec de l\'archivage',
    statusUpdateFailed: 'Échec de mise à jour du statut',
    deleteOrderFailed: 'Échec de suppression de la commande',
    status: {
      pending: 'En attente',
      approved: 'Approuvée',
      ready: 'Prête',
      served: 'Servie'
  },
  viewModes: { cards: 'Cartes', list: 'Liste', compact: 'Compact' },
  itemsLabel: 'Articles'
  }
}

export const getAdminOrdersTexts = (lang: AdminLang) => adminOrdersTexts[lang]
