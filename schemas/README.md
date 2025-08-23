# Schemas (Zod Planned)

هذا المجلد سيحتوي مخططات Zod (أو بديل) لتعريف التحقق + توليد الأنواع.

## المبادئ
- مصدر الحقيقة للـ DTO.
- ممنوع تكرار تعريف النوع في مكان آخر (يُستنتج عبر `z.infer<typeof ...>`).
- كل مخطط = (Input / Output) إن اختلفا.
- أخطاء موحدة: `{ code: string; message: string; field?: string }`.

## تنظيم مقترح
```
schemas/
  auth.ts        (loginSchema, registerSchema)
  users.ts       (userCreateSchema, userUpdateSchema)
  orders.ts      (orderCreateSchema, orderStatusSchema, orderItemsSchema)
  products.ts    (productCreateSchema, productUpdateSchema)
  categories.ts  (categoryCreateSchema, categoryUpdateSchema)
  settings.ts    (settingsUpdateSchema)
  shared.ts      (common reusable primitives: id, language, currency ...)
```

## الخطوات القادمة
1. إضافة zod إلى dependencies.
2. إنشاء `shared.ts` كأساس (id, pagination, language, currency).
3. تطبيق المخططات على أول مسار (auth) ثم تعميم النمط.
4. إضافة Middleware لاستخدام المخطط قبل منطق المسار.

(سيتم تنفيذها في القسم 5 لاحقاً.)
