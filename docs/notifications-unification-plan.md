# خطة توحيد نظام الإشعارات والتنبيهات (Toasts + Push)

## 1. الوضع الحالي (Current State)
- استخدام مكتبة Sonner مباشرة في عشرات المواضع عبر `toast.success|error|info`.
- Hook مركزي `useOrderNotifications` لتوليد Toast للأحداث اللحظية (SSE) + صوت + منع تكرار + BroadcastChannel.
- Service Worker (FCM) يعالج رسائل الدفع ويقوم أحياناً بعرض الإشعار النظامي.
- تفضيلات الإشعارات محلية: LocalStorage (`notification_prefs_v2`).
- اختلاف في الصياغة، الأنماط (className)، مدة الظهور، وعدم وجود طبقة توحيد (Facade) للفصل بين الأنواع (نجاح، خطأ، معلومات، أمر حدثي خاص بالطلبات).
- تكرار منطق بناء الرسائل ونداءات `toast.success(...)` في صفحات متعددة (users, tables, analytics, kitchen, waiter, auth).
- لا يوجد规范 (Standard) لهيكلة الكائن المرسل للـ Toast (مثل: id, kind, scope, i18nKey, meta).

## 2. أهداف التوحيد
1. واجهة واحدة (API) موحدة: `notify(event)` بدلاً من الاستدعاءات المتفرقة لـ `toast.*`.
2. طبقة تكامل بين: (Toast داخل الصفحة) + (Push Notification) + (صوت) + (BroadcastChannel) + (تفضيلات المستخدم).
3. ضمان ثبات التصميم (ألوان، أيقونات، مدة، اتجاه، إمكانية RTL) عبر خريطة إعدادات مركزية.
4. فك الارتباط عن مكتبة Sonner بحيث يسهل استبدالها مستقبلاً.
5. دعم تعقب (Telemetry) لاحق (log: delivery, suppressed, deduped) بدون تعديل جميع المواضع.
6. مركزية النصوص (i18n) وربط الرسائل بالمفاتيح وليس نصوصاً حرة.
7. منع التكرار (dedupe) عالمي (داخل الصفحة + عبر البث) بخوارزمية موحدة وقابلة للتهيئة.
8. فصل أنواع الإشعارات: UI Action Feedback (حفظ/حذف) مقابل Domain Events (تحديث حالة طلب) مقابل System Alerts (انقطاع النظام).

## 3. التصنيف المقترح للأنواع
| الفئة | المثال | الحقول الأساسية |
|-------|--------|------------------|
| action | create_user_success | kind, severity=success, i18nKey, entityId |
| domain | order.ready | kind=order.ready, severity=info, orderId, tableId, dailyNumber |
| system | system.inactive | severity=warning, ttl, sticky |
| error | network.failure | severity=error, retryAction? |
| progress (اختياري) | upload.image | severity=loading, progress% |

## 4. تصميم الواجهة البرمجية (API Design)
واجهة مستوى عالي:
```ts
notify({
  category: 'action' | 'domain' | 'system' | 'error' | 'progress',
  type: string,              // مثل: 'order.ready' أو 'user.created'
  severity?: 'success' | 'error' | 'info' | 'warning' | 'loading',
  i18nKey?: string,          // مفتاح ترجمة أساسي
  i18nParams?: Record<string, any>,
  dedupeKey?: string,        // افتراضي: category+type+entityId
  ttlMs?: number,            // مدة الظهور للـ toast
  sticky?: boolean,          // لا يغلق تلقائياً
  sound?: boolean,           // override تفضيلات الصوت
  push?: boolean,            // flag لطلب push محلي (foreground fallback)
  entityId?: string | number,
  meta?: Record<string, any>,
})
```

نتيجة (اختيارية) ترجع معرّف داخلي لإدارة الإغلاق اليدوي لاحقاً.

## 5. المكونات / الملفات الجديدة المقترحة
```
lib/notifications/
  facade.ts            // export notify(), configureNotifications()
  registry.ts          // خريطة (type => خصائص افتراضية) + i18n mapping
  dedupe.ts            // منطق منع التكرار العام
  channels.ts          // توحيد BroadcastChannel و SW channel
  sound.ts             // تهيئة الصوت وتشغيله حسب السياسة
  preferences.ts       // كان state.ts (إعادة تسمية + توسيع)
  adapters/
    sonner.ts          // التكيّف مع مكتبة sonner
    push.ts            // طلب عرض Notification API إذا سمح + foreground fallback
    sw-bridge.ts       // نشر رسائل إلى Service Worker لملاءمة لاحقة
```

## 6. استراتيجية التنفيذ (مراحل)
### المرحلة 1: تحضير البنية
- إنشاء الملفات: facade, registry, adapters/sonner.
- نقل `loadNotificationPrefs` و `saveNotificationPrefs` إلى `preferences.ts` مع واجهة موسعة.
- استخراج منطق الصوت من `useOrderNotifications` إلى `sound.ts`.

### المرحلة 2: التسجيل (Registry)
- تعريف خريطة ثابتة: `NOTIFICATION_TYPES`:
```ts
const NOTIFICATION_TYPES = {
  'order.new': { category:'domain', severity:'info', i18nKey:'notifications.order.new', sound:true },
  'order.ready': { category:'domain', severity:'success', i18nKey:'notifications.order.ready', sound:true },
  'order.cancelled': { category:'domain', severity:'warning', i18nKey:'notifications.order.cancelled', sound:true },
  'user.created': { category:'action', severity:'success', i18nKey:'users.created' },
  'user.delete.error': { category:'error', severity:'error', i18nKey:'users.deleteError' },
  // ...إلخ
} as const
```
- توليد نوع TypeScript تلقائياً من المفاتيح.

### المرحلة 3: الواجهة الموحدة
- `notify(input)`:
  1. يدمج (input) مع خصائص registry.
  2. يحسم اللغة، يجلب النص عبر i18nKey و i18nParams.
  3. يحسب dedupeKey (إن لم يقدم).
  4. يستدعي `shouldDedupe(dedupeKey)` من dedupe.ts.
  5. يشغل الصوت عبر sound.ts إذا سمح.
  6. يمرر النتيجة إلى adapter (sonner) لعرض toast.
  7. يرسل BroadcastChannel hint.
  8. (اختياري) push foreground fallback إذا flag push=true.

### المرحلة 4: تحديث `useOrderNotifications`
- بدل النداء المباشر إلى `toast(message, ...)` يستدعي:
```ts
notify({ type: `order.${kind}`, i18nParams:{ num, table: merged.table_id }, entityId: merged.id })
```
- إزالة منطق الصوت/التكرار المحلي (تم نقله للـ facade).

### المرحلة 5: تحديث الصفحات
استبدال:
```ts
toast.success(t.markedReadySuccess)
```
بـ:
```ts
notify({ type:'kitchen.order.markReady.success', i18nKey:'kitchen.markReadySuccess' })
```
(مع إضافة تلك الأنواع للـ registry + مفاتيح i18n إن لزم).

### المرحلة 6: توسيع i18n
- إضافة مساحة `notifications.*` لكل لغة.
- ربط المفاتيح الحالية (مثل loginSuccess, deleted, created) بخريطة موحدة (users.created, auth.login.success).

### المرحلة 7: توحيد التفضيلات
- توسيع `NotificationPreferences`:
```ts
interface NotificationPreferences {
  ui: { enableToasts: boolean; durationMs: number }
  sound: { enabled: boolean; volume: number }
  dedupe: { windowMs: number }
  roles: { ...كما هو مع تحسين }
  categories: { action:boolean; domain:boolean; system:boolean; error:boolean }
}
```
- ترحيل LocalStorage (مفتاح جديد v3) مع تحويل تلقائي من v2.

### المرحلة 8: القياس والتتبّع
- إضافة hook اختياري: `onNotify(eventRecord)` في `configureNotifications` لتسجيل التحليلات.

### المرحلة 9: تنظيف (Cleanup)
- إزالة الاستدعاءات المباشرة لـ `toast.*` (إبقاء Sonner Toaster واحد في الجذر).
- تحديث README بمخطط النظام الجديد.

## 7. خوارزمية منع التكرار (Dedupe)
- Map في الذاكرة: المفتاح => timestamp.
- نافذة زمنية: `windowMs` (من prefs). افتراضياً 8s للـ domain، 3s لـ action.
- السماح بتجاوز (override) عبر `force: true`.

Pseudo:
```ts
function shouldDedupe(key:string, windowMs:number){
  const now = Date.now(); const last = map.get(key)||0
  if (now - last < windowMs) return true
  map.set(key, now); return false
}
```

## 8. الصوت (Sound)
- تحميل ملف واحد مع Promise caching.
- السماح بتغيير مستوى الصوت volume (0..1) يخزن في prefs.
- تشغيل محدود: domain events فقط التي لديها `sound:true`.

## 9. المخاطر وخطة التخفيف
| مخاطرة | التخفيف |
|--------|---------|
| كسر نصوص i18n | إضافة مفاتيح مع fallback للنص القديم خلال مرحلة انتقالية |
| نسيان استبدال بعض `toast.*` | grep والتحقق بأداة ts-prune / ESLint rule مخصص |
| تضارب مفاتيح dedupe | توثيق نمط (type + entityId + severity) |
| زيادة حجم الحزم | التأكد أن facade لا يجلب Firebase أو أشياء ثقيلة |
| تأخر التنفيذ | تنفيذ مرحلي PRs صغيرة (registry ثم facade ثم pages) |

## 10. مؤشرات نجاح (KPIs)
- 0 استدعاءات مباشرة لـ `toast.*` خارج `adapters/sonner.ts` (باستثناء الاختبارات).
- تغطية 100% لأنواع الأحداث في registry.
- زمن تنفيذ notify <= 3ms (بدون push) في بيئة dev (قياس بسيط لاحقاً).
- خفض تكرار التوست المكرر (لنفس orderId + kind) إلى 0 ضمن نافذة 8 ثوانٍ.

## 11. أولويات التنفيذ (Sprint Proposal)
1. (اليوم 1) إنشاء الملفات: registry, facade, adapters, dedupe, sound, نقل preferences.
2. (اليوم 2) دمج `useOrderNotifications` مع الواجهة الجديدة.
3. (اليوم 2) استبدال صفحات: auth, users, tables.
4. (اليوم 3) استبدال kitchen, waiter, analytics, menu public (إن وجدت توستات مستقبلية).
5. (اليوم 3) ترقية i18n وإضافة مفاتيح notifications.*.
6. (اليوم 4) إزالة الاستدعاءات القديمة، إضافة README تحديث.
7. (اليوم 4) إضافة ESLint rule (اختياري) لمنع `import { toast } from 'sonner'` خارج adapter.

## 12. أمثلة تطبيقية موجزة
قبل:
```ts
toast.success(t.loginSuccess)
```
بعد:
```ts
notify({ type:'auth.login.success' })
```
(يتم حل النص من i18n بالاعتماد على registry.)

حدث طلب:
```ts
notify({ type:'order.ready', entityId: order.id, i18nParams:{ num: order.daily_number, table: order.table_id } })
```

## 13. المهام التفصيلية (Checklist قابلة للترتيب)
- [ ] إنشاء registry + facade + adapters.
- [ ] ترحيل preferences إلى نموذج جديد (v3) + migration.
- [ ] استخراج الصوت sound.ts.
- [ ] تعديل useOrderNotifications → notify().
- [ ] استبدال كل `toast.*` في صفحات الإدارة.
- [ ] إضافة مفاتيح i18n الجديدة.
- [ ] توثيق في README (قسم Notifications Unified Layer).
- [ ] إضافة ESLint rule (اختياري) لمنع الاستخدام المباشر.
- [ ] اختبار يدوي: سيناريوهات (new, ready, cancel, login success, save error).

## 14. المتطلبات البيئية
- لا تغيير في dependencies حالياً (Sonner مستمر).
- يمكن لاحقاً إضافة `nanoid` للاستخدام في dedupe إذا احتجنا مفاتيح عشوائية.

## 15. الخلاصة
هذه الخطة توفر طبقة موحدة مرنة، تقلل التكرار، تهيئ لتتبع وتحليلات مستقبلية، وتدعم توسيع النظام (أنواع جديدة، مصادر أحداث أخرى) دون تعديل واسع في الصفحات.

---
(انتهى)
