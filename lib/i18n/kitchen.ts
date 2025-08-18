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
    // Order statuses
    pending: "في الانتظار",
    approved: "معتمد",
    ready: "جاهز",
    served: "تم التقديم"
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
    // Order statuses
    pending: "En Attente",
    approved: "Approuvé",
    ready: "Prêt",
    served: "Servi"
  }
}

export function getKitchenTexts(language: "ar" | "fr") {
  return kitchenTexts[language]
}
