// Admin Settings i18n - AR/FR translations for settings management
export const adminSettingsTexts = {
  ar: {
    title: "إعدادات النظام",
    description: "إدارة معلومات المطعم وإعدادات النظام",
    restaurantInfo: "معلومات المطعم",
    systemStatus: "حالة النظام",
    systemOn: "تشغيل",
    systemOff: "متوقف",
    toggleSystem: "تشغيل/إيقاف النظام",
    restaurantName: "اسم المطعم",
    language: "اللغة",
    logo: "الشعار",
    currency: "العملة",
    taxRate: "معدل الضريبة",
    address: "العنوان",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    save: "حفظ التغييرات",
    saving: "جاري الحفظ...",
    lastUpdated: "آخر تحديث",
    offlineMode: "وضع عدم الاتصال",
    offlineDescription: "يتم عرض آخر حالة محفوظة للنظام",
    systemActiveDescription: "النظام يعمل بشكل طبيعي - يمكن للعملاء والموظفين تسجيل الطلبات",
    systemInactiveDescription: "النظام متوقف - لا يمكن تسجيل أي طلبات جديدة",
    confirmToggle: "هل أنت متأكد من تغيير حالة النظام؟",
    uploadLogo: "رفع شعار جديد",
    chooseFile: "اختر ملف",
    arabic: "عربي",
    french: "فرنسي",
    optional: "اختياري",
    loading: "جاري التحميل...",
    processing: "جاري المعالجة...",
    settingsSaved: "تم حفظ الإعدادات بنجاح",
    errorSaving: "حدث خطأ أثناء حفظ الإعدادات",
    manageSettings: "إدارة الإعدادات",
    systemConfiguration: "إعدادات النظام",
    refresh: "تحديث",
    restaurantLogo: "شعار المطعم",
    uploadLogoDesc: "ارفع شعار مطعمك (PNG، JPEG، WebP، أقصى حجم 5 ميجابايت)",
    fileSelected: "ملف محدد:",
    uploading: "جاري الرفع...",
    updateLogo: "تحديث الشعار"
  , resetDailyNumber: "إعادة ترقيم الطلبات اليومية"
  , resetDailyNumberDesc: "يعيد العداد إلى 0 لليوم الحالي (أول طلب جديد يصبح رقم 1)"
  , confirmResetDailyTitle: "تأكيد إعادة الترقيم"
  , confirmResetDailyDesc: "سيتم إعادة تعيين عداد أرقام الطلبات اليومية لهذا اليوم. أول طلب جديد سيحصل على الرقم 1. لن يتغير أي طلب سابق. هل تريد المتابعة؟"
  , confirm: "تأكيد"
  , cancel: "إلغاء"
  , resetSuccess: "تمت إعادة الترقيم"
  , resetFailed: "فشل في إعادة الترقيم"
  },
  fr: {
    title: "Paramètres Système",
    description: "Gérer les informations du restaurant et les paramètres système",
    restaurantInfo: "Informations Restaurant",
    systemStatus: "État du Système",
    systemOn: "Activé",
    systemOff: "Arrêté",
    toggleSystem: "Activer/Désactiver le Système",
    restaurantName: "Nom du Restaurant",
    language: "Langue",
    logo: "Logo",
    currency: "Devise",
    taxRate: "Taux de Taxe",
    address: "Adresse",
    phone: "Téléphone",
    email: "Email",
    save: "Enregistrer les Modifications",
    saving: "Enregistrement...",
    lastUpdated: "Dernière mise à jour",
    offlineMode: "Mode Hors Ligne",
    offlineDescription: "Affichage du dernier état sauvegardé du système",
    systemActiveDescription: "Le système fonctionne normalement - les clients et le personnel peuvent passer des commandes",
    systemInactiveDescription: "Le système est arrêt - aucune nouvelle commande ne peut être passée",
    confirmToggle: "Êtes-vous sûr de vouloir changer l'état du système?",
    uploadLogo: "Télécharger un nouveau logo",
    chooseFile: "Choisir un fichier",
    arabic: "Arabe",
    french: "Français",
    optional: "Optionnel",
    loading: "Chargement...",
    processing: "Traitement en cours...",
    settingsSaved: "Paramètres enregistrés avec succès",
    errorSaving: "Erreur lors de l'enregistrement des paramètres",
    manageSettings: "Gérer les paramètres",
    systemConfiguration: "Configuration système",
    refresh: "Actualiser",
    restaurantLogo: "Logo du restaurant",
    uploadLogoDesc: "Téléchargez le logo de votre restaurant (PNG, JPEG, WebP, max 5MB)",
    fileSelected: "Fichier sélectionné:",
    uploading: "Téléchargement...",
    updateLogo: "Mettre à jour le logo"
  , resetDailyNumber: "Réinitialiser la numérotation du jour"
  , resetDailyNumberDesc: "Remet le compteur du jour à 0 (la prochaine commande sera 1)"
  , confirmResetDailyTitle: "Confirmer la réinitialisation"
  , confirmResetDailyDesc: "Le compteur des numéros de commande pour aujourd'hui sera remis à zéro. La prochaine commande aura le numéro 1. Les commandes existantes restent inchangées. Continuer ?"
  , confirm: "Confirmer"
  , cancel: "Annuler"
  , resetSuccess: "Compteur réinitialisé"
  , resetFailed: "Échec de la réinitialisation"
  }
}

export function getAdminSettingsTexts(language: 'ar' | 'fr') {
  return adminSettingsTexts[language] || adminSettingsTexts.fr
}
