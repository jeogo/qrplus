// Unified notification registry
export type NotificationCategory = 'action' | 'domain' | 'system' | 'error' | 'progress'
export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning' | 'loading'
export interface NotificationRegistryEntry { category:NotificationCategory; severity:NotificationSeverity; dedupeWindowMs?:number; sound?:boolean; sticky?:boolean; push?:boolean; ar:(p?:any)=>string; fr:(p?:any)=>string; en?:(p?:any)=>string }
// Alias used by facade for clarity
export type NotificationDefinition = NotificationRegistryEntry
const D_DOMAIN = 8000, D_ACTION = 1500
const staticMsg = (ar:string, fr:string, en?:string) => ({ ar:()=>ar, fr:()=>fr, en:()=> en || fr })
export const NOTIFICATION_TYPES = {
  // Auth
  'auth.login.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم تسجيل الدخول','Connexion réussie','Logged in') },
  'auth.login.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تسجيل الدخول','Échec de connexion','Login failed') },
  'auth.register.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم إنشاء الحساب','Compte créé','Account created') },
  'auth.register.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إنشاء الحساب','Échec de création du compte','Account creation failed') },
  'logout.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم تسجيل الخروج','Déconnexion réussie','Logged out') },
  'logout.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تسجيل الخروج','Échec déconnexion','Logout failed') },
  // Orders domain events
  'order.new': { category:'domain', severity:'info', sound:true, dedupeWindowMs:D_DOMAIN, ar:(p:any)=>`طلب جديد رقم #${p?.num}${p?.table?` (طاولة ${p.table})`:''}`, fr:(p:any)=>`Nouvelle commande #${p?.num}${p?.table?` (Table ${p.table})`:''}`, en:(p:any)=>`New order #${p?.num}${p?.table?` (Table ${p.table})`:''}` },
  'order.approved': { category:'domain', severity:'info', sound:true, dedupeWindowMs:D_DOMAIN, ar:(p:any)=>`تم اعتماد الطلب #${p?.num}${p?.table?` (طاولة ${p.table})`:''}`, fr:(p:any)=>`Commande #${p?.num} approuvée${p?.table?` (Table ${p.table})`:''}`, en:(p:any)=>`Order #${p?.num} approved${p?.table?` (Table ${p.table})`:''}` },
  'order.ready': { category:'domain', severity:'success', sound:true, dedupeWindowMs:D_DOMAIN, ar:(p:any)=>`الطلب #${p?.num} جاهز${p?.table?` (طاولة ${p.table})`:''}`, fr:(p:any)=>`Commande #${p?.num} prête${p?.table?` (Table ${p.table})`:''}`, en:(p:any)=>`Order #${p?.num} ready${p?.table?` (Table ${p.table})`:''}` },
  'order.served': { category:'domain', severity:'info', sound:false, dedupeWindowMs:D_DOMAIN, ar:(p:any)=>`تم تقديم الطلب #${p?.num}`, fr:(p:any)=>`Commande #${p?.num} servie`, en:(p:any)=>`Order #${p?.num} served` },
  'order.cancelled': { category:'domain', severity:'warning', sound:true, dedupeWindowMs:D_DOMAIN, ar:(p:any)=>`تم إلغاء الطلب #${p?.num}${p?.table?` (طاولة ${p.table})`:''}`, fr:(p:any)=>`Commande #${p?.num} annulée${p?.table?` (Table ${p.table})`:''}`, en:(p:any)=>`Order #${p?.num} cancelled${p?.table?` (Table ${p.table})`:''}` },
  // Kitchen actions
  'kitchen.order.markReady.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم وضع الطلب جاهز','Commande marquée prête','Order marked ready') },
  'kitchen.order.markReady.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل وضع الطلب جاهز','Échec marquage prêt','Failed to mark order ready') },
  'kitchen.order.cancel.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم إلغاء الطلب','Commande annulée','Order cancelled') },
  'kitchen.order.cancel.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إلغاء الطلب','Échec annulation','Failed to cancel order') },
  // Waiter actions
  'waiter.order.serve.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم تقديم الطلب','Commande servie','Order served') },
  'waiter.order.serve.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تقديم الطلب','Échec service','Failed to serve order') },
  'waiter.order.cancel.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم إلغاء الطلب','Commande annulée','Order cancelled') },
  'waiter.order.cancel.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إلغاء الطلب','Échec annulation','Failed to cancel order') },
  // Users
  'users.load.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تحميل المستخدمين','Échec chargement utilisateurs','Failed to load users') },
  'users.create.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم إنشاء المستخدم','Utilisateur créé','User created') },
  'users.create.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إنشاء المستخدم','Échec création utilisateur','Failed to create user') },
  'users.update.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم التحديث','Mis à jour','Updated') },
  'users.update.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل التحديث','Échec mise à jour','Update failed') },
  'users.delete.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم الحذف','Supprimé','Deleted') },
  'users.delete.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل الحذف','Échec suppression','Delete failed') },
  // Tables
  'tables.create.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم إضافة الطاولة','Table ajoutée','Table added') },
  'tables.create.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إضافة الطاولة','Échec ajout table','Failed to add table') },
  'tables.update.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم تحديث الطاولة','Table mise à jour','Table updated') },
  'tables.update.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تحديث الطاولة','Échec mise à jour table','Failed to update table') },
  'tables.delete.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم حذف الطاولة','Table supprimée','Table deleted') },
  'tables.delete.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل حذف الطاولة','Échec suppression table','Failed to delete table') },
  'tables.refresh.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم التحديث','Actualisé','Refreshed') },
  // Orders admin actions
  'orders.refresh.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم التحديث','Actualisé','Refreshed') },
  'orders.refresh.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل التحديث','Échec actualisation','Refresh failed') },
  'orders.status.update.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم تحديث حالة الطلب','Statut mis à jour','Order status updated') },
  'orders.status.update.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تحديث الطلب','Échec mise à jour','Failed to update order') },
  'orders.archive.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تمت الأرشفة','Archivé','Archived') },
  'orders.archive.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل الأرشفة','Échec archivage','Archive failed') },
  // Menu (admin)
  'menu.categories.load.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تحميل الفئات','Échec chargement catégories','Failed to load categories') },
  'menu.products.load.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تحميل المنتجات','Échec chargement produits','Failed to load products') },
  'menu.save.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم الحفظ','Enregistré','Saved') },
  'menu.save.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل الحفظ','Échec sauvegarde','Save failed') },
  'menu.delete.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم الحذف','Supprimé','Deleted') },
  'menu.delete.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل الحذف','Échec suppression','Delete failed') },
  'menu.refresh.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم التحديث','Actualisé','Refreshed') },
  // Analytics
  'analytics.refresh.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم التحديث','Actualisé','Refreshed') },
  'analytics.refresh.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل التحديث','Échec actualisation','Refresh failed') },
  // Settings
  'settings.save.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم الحفظ','Enregistré','Saved') },
  'settings.save.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل الحفظ','Échec enregistrement','Save failed') },
  'settings.toggle.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم التحديث','Mise à jour','Updated') },
  'settings.toggle.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل التحديث','Échec mise à jour','Update failed') },
  'settings.logo.upload.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم رفع الشعار','Logo téléversé','Logo uploaded') },
  'settings.logo.upload.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل رفع الشعار','Échec téléversement logo','Failed to upload logo') },
  'settings.logo.reset.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تمت إعادة ضبط الشعار','Logo réinitialisé','Logo reset') },
  'settings.logo.reset.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إعادة ضبط الشعار','Échec réinitialisation logo','Failed to reset logo') },
  'settings.resetDaily.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تمت إعادة ضبط العداد اليومي','Compteur quotidien réinitialisé','Daily counter reset') },
  'settings.resetDaily.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل إعادة ضبط العداد اليومي','Échec réinitialisation compteur','Failed to reset daily counter') },
  // Dashboard
  'dashboard.refresh.success': { category:'action', severity:'success', dedupeWindowMs:D_ACTION, ...staticMsg('تم تحديث الإحصائيات','Stats mises à jour','Stats updated') },
  'dashboard.refresh.error': { category:'error', severity:'error', dedupeWindowMs:D_ACTION, ...staticMsg('فشل تحميل الإحصائيات','Échec chargement stats','Failed to load stats') },
  // System
  'system.inactive': { category:'system', severity:'warning', dedupeWindowMs:15000, sticky:true, ...staticMsg('النظام غير نشط','Système inactif','System inactive') },
  'system.error.generic': { category:'system', severity:'error', dedupeWindowMs:5000, ...staticMsg('خطأ في النظام','Erreur système','System error') }
} as const
export type NotificationType = keyof typeof NOTIFICATION_TYPES
export function getNotificationEntry(type: NotificationType){ return NOTIFICATION_TYPES[type] }
