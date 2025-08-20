export type PublicMenuLanguage = 'ar' | 'fr'

interface StatusMessages { pending:string; accepted:string; preparing:string; ready:string; served:string }
export interface PublicMenuTexts {
	cart:string; total:string; orderNow:string; empty:string; addToCart:string; quantity:string; remove:string; dzd:string; categories:string; products:string; loading:string; table:string; order:string; myOrders:string; orderStatus:string; pending:string; accepted:string; preparing:string; ready:string; served:string; orderNote:string; addNote:string; orderHistory:string; noOrders:string; orderPlaced:string; orderUpdated:string; systemInactive:string; systemInactiveMessage:string; notifications:string; enableSounds:string; items:string; viewProducts:string; unavailable:string; orderItems:string; orderReady:string; backToCategories:string; statusMessages:StatusMessages
}

const texts: Record<PublicMenuLanguage, PublicMenuTexts> = {
	ar: {
		cart: 'السلة', total: 'المجموع', orderNow: 'اطلب الآن', empty: 'فارغ', addToCart: 'إضافة للسلة', quantity: 'الكمية', remove: 'حذف', dzd: 'د.ج', categories: 'الفئات', products: 'المنتجات', loading: 'جاري التحميل...', table: 'طاولة', order: 'طلب', myOrders: 'طلباتي', orderStatus: 'حالة الطلب', pending: 'قيد الانتظار', accepted: 'مقبول', preparing: 'قيد التحضير', ready: 'جاهز', served: 'تم التقديم', orderNote: 'ملاحظة الطلب', addNote: 'إضافة ملاحظة', orderHistory: 'تاريخ الطلبات', noOrders: 'لا توجد طلبات', orderPlaced: 'تم تقديم الطلب', orderUpdated: 'تم تحديث الطلب', systemInactive: 'النظام غير نشط', systemInactiveMessage: 'النظام مغلق حالياً. يرجى المحاولة لاحقاً.', notifications: 'الإشعارات', enableSounds: 'تفعيل الأصوات', items: 'عناصر', viewProducts: 'عرض المنتجات', unavailable: 'غير متوفر', orderItems: 'عناصر الطلب', orderReady: 'طلبكم جاهز!', backToCategories: 'العودة للفئات', statusMessages: { pending: 'طلبكم قيد المراجعة', accepted: 'تم قبول الطلب وبدء التحضير', preparing: 'يتم تحضير طلبكم الآن', ready: 'طلبكم جاهز للاستلام', served: 'تم تقديم طلبكم. شهية طيبة' }
	},
	fr: {
		cart: 'Panier', total: 'Total', orderNow: 'Commander', empty: 'Vide', addToCart: 'Ajouter au panier', quantity: 'Quantité', remove: 'Supprimer', dzd: 'DA', categories: 'Catégories', products: 'Produits', loading: 'Chargement...', table: 'Table', order: 'Commande', myOrders: 'Mes commandes', orderStatus: 'Statut de la commande', pending: 'En attente', accepted: 'Acceptée', preparing: 'En préparation', ready: 'Prête', served: 'Servie', orderNote: 'Note de commande', addNote: 'Ajouter une note', orderHistory: 'Historique des commandes', noOrders: 'Aucune commande', orderPlaced: 'Commande passée', orderUpdated: 'Commande mise à jour', systemInactive: 'Système inactif', systemInactiveMessage: 'Le système est actuellement fermé. Veuillez réessayer plus tard.', notifications: 'Notifications', enableSounds: 'Activer les sons', items: 'articles', viewProducts: 'Voir les produits', unavailable: 'Indisponible', orderItems: 'Articles de commande', orderReady: 'Votre commande est prête!', backToCategories: 'Retour aux catégories', statusMessages: { pending: 'Votre commande est en cours de révision', accepted: 'Commande acceptée et préparation commencée', preparing: 'Votre commande est en cours de préparation', ready: 'Votre commande est prête à être récupérée', served: 'Votre commande a été servie. Bon appétit' }
	}
}

export function getPublicMenuTexts(lang: PublicMenuLanguage): PublicMenuTexts {
	return texts[lang] || texts.ar
}
