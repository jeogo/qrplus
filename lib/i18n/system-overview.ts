// Comprehensive system overview / long form Arabic (with French fallback) text for import.
// Use: import { systemOverviewTexts } from '@/lib/i18n/system-overview'
// Access: systemOverviewTexts[lang].intro / .features etc.

export interface SystemOverviewSection {
  intro: string
  architecture: string
  orderFlow: string
  roles: string
  statuses: string
  notifications: string
  performance: string
  security: string
  roadmap: string
  glossary: string
}

export const systemOverviewTexts: Record<'ar'|'fr', SystemOverviewSection> = {
  ar: {
    intro: `\nمنظومة QRPlus هي منصة متكاملة لإدارة المطاعم تُبسِّط دورة حياة الطلب منذ لحظة إنشائه من قِبَل العميل عبر رمز QR وحتى تقديمه وأرشفته. تم تصميمها بحيث تكون خفيفة، سريعة، ثنائية اللغة (عربي / فرنسي)، وقابلة للتوسع لاحقًا بدون تغييرات جذرية.\n\nتعتمد الواجهة على Next.js (App Router) وتدفق بيانات حي (SSE) + إشعارات دفع (FCM) لضمان استجابة فورية لكل الأدوار (مدير، مطبخ، نادل) مع الحد الأدنى من الاستهلاك الشبكي.`,
    architecture: `\nالبنية الأساسية:\n- الواجهة (Next.js 14 App Router) مع مكونات تفاعلية وقابلة لإعادة الاستخدام.\n- Firestore (سجلات: orders, order_items, tables, device_tokens, accounts, products).\n- قنوات تزامن: EventSource (SSE) لتدفق الطلبات الحي + Firebase Cloud Messaging للإشعارات النظامية.\n- Service Worker مخصص: تسجيل مبكر، معالجة foreground/background، إظهار الإشعار حتى إن نقصت الحقول.\n- آلية إزالة الضجيج: BroadcastChannel + خرائط ذاكرة مؤقتة لتفادي التكرار بين التوست و إشعارات النظام.\n- فصل مسؤوليات: ملفات i18n لكل صفحة، وحدات push-sender مجردة حسب حالة الطلب.\n- أرشفة الطلبات النهائية: نقل الطلب إلى التخزين المؤرشف بعد served أو إلغاء.`,
    orderFlow: `\nتدفق الطلب (Lifecycle):\n1. إنشاء: عميل (مسار عام) أو مدير (لوحة الإدارة) => الحالة 'pending'.\n2. اعتماد: المدير يغيّر إلى 'approved' ليدخل قائمة التحضير.\n3. جاهز: المطبخ (أو المدير) يغيّر إلى 'ready' لإخطار النادل.\n4. تقديم: النادل (أو المدير) يضع 'served' => يتم الأرشفة تلقائياً.\n5. إلغاء: حذف طلب 'pending' يحوله إلى حالة منطقية 'cancelled' لتوثيق السجل.`,
    roles: `\nالأدوار الرئيسية:\n- المدير (admin): تحكم شامل (إنشاء، اعتماد، جاهز، تقديم، إلغاء، إعدادات النظام، المستخدمين، التحليلات).\n- المطبخ (kitchen): يرى طلبات جديدة / معتمدة، يعلن الجاهزية.\n- النادل (waiter): يتابع الطلبات الجاهزة ويعلن التقديم.\nيمكن توسيع النظام لإضافة أدوار مستقبلية (التوصيل، الكاشير) بدون إعادة تصميم جذرية.`,
    statuses: `\nحالات الطلب (Statuses):\n- pending: أنشئ ولم يُعتمد بعد.\n- approved: مُصرَّح بالتحضير.\n- ready: جاهز للتقديم.\n- served: مُقدَّم وأرشيفياً نهائي.\n- cancelled: (حالة منطقية عند حذف pending).\nالقواعد: انتقال خطي مضبوط validateTransition() لمنع تخطي أو قفز غير شرعي.`,
    notifications: `\nالإشعارات متعددة الطبقات:\n1) Toast داخل الصفحة (sonner) مع صوت اختياري + إزالة تكرار زمني.\n2) إشعارات دفع نظامية (FCM) بحِزَم مقسمة حسب (الدور + اللغة).\n3) تفادي الازدواج: BroadcastChannel يضع مفاتيح (orderId:kind) لمدة قصيرة.\n4) دعم foreground عبر listenForegroundMessages مع fallback لإظهار الإشعار يدوياً.\nالأحداث المغطاة: new, approved, ready, served, cancelled. يمكن تفعيل/تعطيل كل نوع لكل دور.`,
    performance: `\nالأداء والكفاءة:\n- دمج التحديثات: تدفق SSE مجمّع يقلل طلبات polling.\n- cache خفيف في الذاكرة لتفاصيل العناصر مع إستراتيجية SWR.\n- تجزئة إرسال FCM (حتى 500 توكن في الدفعة).\n- إطفاء تلقائي لإرسال FCM عند غياب توكنات نشطة.\n- واجهات محسّنة (تصنيف، تصفية، تحميل مبدئي).`,
    security: `\nالأمان والضبط:\n- حراسة المسارات requireSession لكل واجهات الإدارة.\n- تفويض دقيق: المطبخ لا يقدم – النادل لا يعتمد – قيود حذف.\n- تنظيف توكنات FCM غير الصالحة عند أخطاء الإرسال.\n- حدود كمية للمدخلات (items <= 40، quantity، إجمالي السعر) لمنع إساءة الاستخدام.\n- حظر إنشاء أو تحديث عند systemInactive.`,
    roadmap: `\nخارطة تطوير مستقبلية مقترحة:\n- تفضيلات إشعار واجهة كاملة (UI) لكل دور.\n- قنوات عميل Push (متابعة حالة الطلب من جهاز الزبون).\n- دعم تنبيهات بريدية / Telegram webhook.\n- مؤشرات زمنية SLA (مدة التحضير، زمن الخدمة).\n- دعم الفوترة / الدفع الإلكتروني.\n- لوحة مراقبة حية (Live Ops).\n- تكامل تحليلات أكثر (متوسط زمن من pending إلى ready).`,
    glossary: `\nمعجم مختصر:\nSSE: بث أحداث مستمر عبر HTTP.\nFCM: خدمة رسائل Firebase.\nService Worker: سكربت وسيط يعمل بالخلفية لمعالجة الإشعارات.\nArchive: نقل طلب نهائي لتخزين منفصل/حالة نهائية.\nDedupe: تفادي التكرار خلال نافذة زمنية.\nLifecycle: دورة حياة الطلب من الإنشاء للإقفال.\n`,
  },
  fr: {
    intro: `Plateforme QRPlus pour la gestion complète des commandes restaurant (création via QR, préparation, service, archivage) avec Next.js + SSE + FCM.`,
    architecture: `Architecture: Next.js App Router, Firestore, SSE pour flux temps réel, FCM pour notifications système, Service Worker dédié, découpage i18n par page.`,
    orderFlow: `Cycle: pending -> approved -> ready -> served (archivé); suppression pending => cancelled logique.`,
    roles: `Rôles: admin (toutes actions), cuisine (préparation -> ready), serveur (ready -> served). Extensible.`,
    statuses: `Statuts: pending, approved, ready, served, cancelled (logique). Transitions validées.`,
    notifications: `Notifications: toasts (avec son), FCM (groupé par rôle+langue), déduplication BroadcastChannel, foreground fallback. Événements: new, approved, ready, served, cancelled.`,
    performance: `Performance: SSE réduit le polling, cache léger, batch FCM (500), filtrage & préchargement.`,
    security: `Sécurité: requireSession, validations de rôle, nettoyage tokens invalides, limites d'entrée, blocage si système inactif.`,
    roadmap: `Feuille de route: préférences UI avancées, push client, webhooks, métriques SLA, paiement, tableau live, analytics temps de préparation.`,
    glossary: `Glossaire: SSE, FCM, Service Worker, Archive, Dedupe, Lifecycle.`
  }
}

export function getSystemOverview(lang: 'ar'|'fr') { return systemOverviewTexts[lang] }
