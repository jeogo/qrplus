export type Lang = 'ar' | 'fr' | 'en'

export const notificationTexts = {
  newOrder: {
    ar: (num: number, table: number | undefined) => `طلب جديد رقم #${num}${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Nouvelle commande #${num}${table? ` (Table ${table})` : ''}`,
    en: (num: number, table: number | undefined) => `New order #${num}${table? ` (Table ${table})` : ''}`
  },
  orderApproved: {
    ar: (num: number, table: number | undefined) => `تم اعتماد الطلب #${num}${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Commande #${num} approuvée${table? ` (Table ${table})` : ''}`,
    en: (num: number, table: number | undefined) => `Order #${num} approved${table? ` (Table ${table})` : ''}`
  },
  orderReady: {
    ar: (num: number, table: number | undefined) => `الطلب #${num} جاهز للتقديم${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Commande #${num} prête${table? ` (Table ${table})` : ''}`,
    en: (num: number, table: number | undefined) => `Order #${num} ready${table? ` (Table ${table})` : ''}`
  },
  orderServed: {
    ar: (num: number) => `تم تقديم الطلب #${num}`,
    fr: (num: number) => `Commande #${num} servie`,
    en: (num: number) => `Order #${num} served`
  },
  orderCancelled: {
    ar: (num: number, table: number | undefined) => `تم إلغاء الطلب #${num}${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Commande #${num} annulée${table? ` (Table ${table})` : ''}`,
    en: (num: number, table: number | undefined) => `Order #${num} cancelled${table? ` (Table ${table})` : ''}`
  }
}

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  // Support both legacy 'language' and current 'admin-language' keys
  const stored = (localStorage.getItem('language') || localStorage.getItem('admin-language') || localStorage.getItem('qr_menu_lang')) as string | null
  if (stored === 'ar' || stored === 'fr' || stored === 'en') return stored
  return 'en'
}
