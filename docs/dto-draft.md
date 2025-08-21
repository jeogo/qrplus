# مسودة DTO أولية (Draft)

> سيتم تطوير هذه المسودة في مرحلة (القسم 5: التحقق + DTO) وتحويلها إلى Zod Schemas لاحقاً.

## المبادئ العامة المقترحة
- الحقول الداخلة من العميل (Requests) تعتمد camelCase.
- المخزن في القاعدة (DB) يمكن أن يبقى snake_case مع طبقة تحويل.
- كل Endpoint: (Input DTO) + (Response DTO) + (Error Shape { code, message, field? }).
- منع تسرب حقول داخلية (password hash, internal ids).

---
## 1. Auth
### LoginInputDTO
```ts
{ username: string; password: string }
```
### LoginResponseDTO
```ts
{ token: string; user: { id:number; username:string; role:'admin'|'waiter'|'kitchen' } }
```
### RegisterInputDTO
```ts
{ username: string; password: string; role:'admin'|'waiter'|'kitchen' }
```

## 2. Users
### UserCreateDTO
```ts
{ username:string; password:string; role:'admin'|'waiter'|'kitchen' }
```
### UserUpdateDTO
```ts
{ username?:string; password?:string; role?:'admin'|'waiter'|'kitchen'; active?:boolean }
```
### UserSummaryDTO
```ts
{ id:number; username:string; role:'admin'|'waiter'|'kitchen'; active?:boolean }
```

## 3. Tables
### TableCreateDTO
```ts
{ tableNumber:number }
```
### TableUpdateDTO
```ts
{ tableNumber?:number }
```
### TableDTO
```ts
{ id:number; tableNumber:number; qrCode:string }
```

## 4. Categories
### CategoryCreateDTO
```ts
{ name:string; image?:File|URL }
```
### CategoryUpdateDTO
```ts
{ name?:string; image?:File|URL; archived?:boolean }
```
### CategoryDTO
```ts
{ id:number; name:string; imageUrl?:string }
```

## 5. Products
### ProductCreateDTO
```ts
{ categoryId:number; name:string; description?:string; price:number; image?:File|URL; available?:boolean }
```
### ProductUpdateDTO
```ts
{ name?:string; description?:string; price?:number; image?:File|URL; available?:boolean; categoryId?:number }
```
### ProductDTO
```ts
{ id:number; categoryId:number; name:string; description?:string; price:number; imageUrl?:string; available:boolean }
```

## 6. Orders
### OrderCreateDTO
```ts
{ tableId:number; items:{ productId:number; quantity:number }[] }
```
### OrderStatusUpdateDTO
```ts
{ status:'approved'|'ready'|'served'|'cancelled' }
```
### OrderDTO
```ts
{ id:number; tableId:number; status:'pending'|'approved'|'ready'|'served'|'cancelled'; total:number; items: OrderItemDTO[]; createdAt:string }
```
### OrderItemDTO
```ts
{ productId:number; name:string; price:number; quantity:number }
```

## 7. Settings
### SettingsUpdateDTO
```ts
{ language?:'ar'|'fr'; currency?:'USD'|'EUR'|'MAD'|'TND'|'DZD'; tax?:number; logo?:File|URL }
```
### SettingsDTO
```ts
{ language:'ar'|'fr'; currency:'USD'|'EUR'|'MAD'|'TND'|'DZD'; tax:number; logoUrl?:string }
```

## 8. Notifications Preferences (Unified)
### NotificationPrefsDTO
```ts
{ ui:{ enableToasts:boolean; durationMs:number }; sound:{ enabled:boolean; volume:number }; roles:any; categories:{ action:boolean; domain:boolean; system:boolean; error:boolean; progress:boolean } }
```

---
## فجوات التحقق الحالية (مبدئي)
- لا يوجد تحقق صريح للمدخلات (Zod) في نقاط (user create/update, order status update, product/category modifications).
- لا توجد طبقة Normalization (trim / lowercase) موحدة.
- الرسائل الخطأ غير موحدة الشكل.

## الخطوات التالية المقترحة
1. بناء مجلد `schemas/` وإضافة مخططات Zod لهذه الـ DTO.
2. توليد Types منها تلقائياً (infer) بدلاً من تعريفات يدوية مزدوجة.
3. إضافة Middleware لتطبيق التحقق على كل طلب API (POST/PUT/PATCH).
4. تعريف Error Factory قياسي.
