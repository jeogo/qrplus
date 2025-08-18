export type Lang = 'ar' | 'fr'

export const notificationTexts = {
  newOrder: {
    ar: (num: number, table: number | undefined) => `طلب جديد رقم #${num}${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Nouvelle commande #${num}${table? ` (Table ${table})` : ''}`
  },
  orderApproved: {
    ar: (num: number, table: number | undefined) => `تم اعتماد الطلب #${num}${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Commande #${num} approuvée${table? ` (Table ${table})` : ''}`
  },
  orderReady: {
    ar: (num: number, table: number | undefined) => `الطلب #${num} جاهز للتقديم${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Commande #${num} prête${table? ` (Table ${table})` : ''}`
  },
  orderServed: {
    ar: (num: number) => `تم تقديم الطلب #${num}`,
    fr: (num: number) => `Commande #${num} servie`
  },
  orderCancelled: {
    ar: (num: number, table: number | undefined) => `تم إلغاء الطلب #${num}${table? ` (طاولة ${table})` : ''}`,
    fr: (num: number, table: number | undefined) => `Commande #${num} annulée${table? ` (Table ${table})` : ''}`
  }
}

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  // Support both legacy 'language' and current 'admin-language' keys
  const stored = localStorage.getItem('language') || localStorage.getItem('admin-language')
  return stored === 'ar' ? 'ar' : 'fr'
}
