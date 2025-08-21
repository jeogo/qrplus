// Kitchen page internationalization

const kitchenTexts = {
  ar: {
    title: "المطبخ",
    loading: "جاري التحميل...",
    noOrders: "لا توجد طلبات جاهزة",
    refresh: "تحديث",
    markReady: "جاهز للتقديم",
    table: "طاولة",
    items: "الأصناف",
    quantity: "الكمية",
    total: "المجموع",
    justNow: "الآن",
    minute: "دقيقة",
    minutes: "دقائق",
    ago: "منذ",
    soundOn: "الصوت مفعل",
    soundOff: "الصوت مغلق",
    orderReady: "طلب جديد!",
    orderReadyDesc: "طلب جديد جاهز للإعداد",
    approvedOrders: "طلبات للإعداد",
    ordersToPrep: "طلب في انتظار الإعداد",
  markedReadySuccess: "تم وضع علامة جاهز",
  markedReadyFail: "فشل التحديث",
  cancelledSuccess: "تم الإلغاء",
  cancelledFail: "فشل الإلغاء",
    // Order statuses
    pending: "في الانتظار",
    approved: "معتمد",
    ready: "جاهز",
    served: "تم التقديم"
  , logout: "تسجيل الخروج"
  },
  fr: {
    title: "Cuisine",
    loading: "Chargement...",
    noOrders: "Aucune commande à préparer",
    refresh: "Actualiser",
    markReady: "Marquer Prêt",
    table: "Table",
    items: "Articles",
    quantity: "Quantité",
    total: "Total",
    justNow: "À l'instant",
    minute: "minute",
    minutes: "minutes",
    ago: "il y a",
    soundOn: "Son Activé",
    soundOff: "Son Désactivé",
    orderReady: "Nouvelle commande!",
    orderReadyDesc: "Nouvelle commande à préparer",
    approvedOrders: "Commandes à Préparer",
    ordersToPrep: "commande(s) à préparer",
  markedReadySuccess: "Commande marquée prête",
  markedReadyFail: "Échec de la mise à jour",
  cancelledSuccess: "Commande annulée",
  cancelledFail: "Échec de l'annulation",
    // Order statuses
    pending: "En Attente",
    approved: "Approuvé",
    ready: "Prêt",
    served: "Servi"
  , logout: "Se déconnecter"
  },
  en: {
    title: "Kitchen",
    loading: "Loading...",
    noOrders: "No orders to prepare",
    refresh: "Refresh",
    markReady: "Mark Ready",
    table: "Table",
    items: "Items",
    quantity: "Qty",
    total: "Total",
    justNow: "just now",
    minute: "minute",
    minutes: "minutes",
    ago: "ago",
    soundOn: "Sound On",
    soundOff: "Sound Off",
    orderReady: "New order!",
    orderReadyDesc: "New order to prepare",
    approvedOrders: "Orders to Prepare",
    ordersToPrep: "order(s) to prepare",
    markedReadySuccess: "Marked ready",
    markedReadyFail: "Update failed",
    cancelledSuccess: "Order cancelled",
    cancelledFail: "Cancel failed",
    pending: "Pending",
    approved: "Approved",
    ready: "Ready",
    served: "Served"
  , logout: "Logout"
  }
}

// Add supplemental shared keys used by components if missing (fallback handled in component)
;(kitchenTexts as any).ar.loadingDetails ||= kitchenTexts.ar.loading
;(kitchenTexts as any).fr.loadingDetails ||= kitchenTexts.fr.loading
;(kitchenTexts as any).en.loadingDetails ||= kitchenTexts.en.loading
;(kitchenTexts as any).ar.note ||= 'ملاحظة'
;(kitchenTexts as any).fr.note ||= 'Note'
;(kitchenTexts as any).en.note ||= 'Note'
;(kitchenTexts as any).ar.cancel ||= 'إلغاء'
;(kitchenTexts as any).fr.cancel ||= 'Annuler'
;(kitchenTexts as any).en.cancel ||= 'Cancel'

export function getKitchenTexts(language: "ar" | "fr" | "en") { return kitchenTexts[language] }
