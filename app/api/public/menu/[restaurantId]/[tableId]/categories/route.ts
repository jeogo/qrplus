import { NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/menu/:restaurantId/:tableId/categories
export async function GET(
  _req: Request,
  context: { params: Promise<{ restaurantId: string; tableId: string }> }
) {
  try {
    const { restaurantId, tableId } = await context.params  // ✅ ننتظر params
    const restaurantIdNum = Number(restaurantId)
    const tableIdNum = Number(tableId)

    if (!Number.isInteger(restaurantIdNum) || !Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const db = admin.firestore()

    // تحقق من وجود المطعم
    const accountSnap = await db.collection('accounts').doc(String(restaurantIdNum)).get()
    if (!accountSnap.exists) {
      return NextResponse.json({ success: false, error: 'RESTAURANT_NOT_FOUND' }, { status: 404 })
    }

    // تحقق من وجود الطاولة
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }

    const tableData = tableSnap.data()!
    if (tableData.account_id !== restaurantIdNum) {
      return NextResponse.json({ success: false, error: 'MISMATCH' }, { status: 404 })
    }

    // جلب التصنيفات الفعالة
    const catSnap = await db
      .collection('categories')
      .where('account_id', '==', restaurantIdNum)
      .where('active', '==', true)
      .orderBy('name')
      .get()

    const categories = catSnap.docs.map((d) => d.data())
    if (!categories.length) {
      return NextResponse.json({ success: true, data: [] })
    }

    // جلب المنتجات المتاحة وربطها بالتصنيفات
    const prodSnap = await db
      .collection('products')
      .where('account_id', '==', restaurantIdNum)
      .where('available', '==', true)
      .get()

    const availCat = new Set(prodSnap.docs.map((d) => d.data().category_id))
    const filtered = categories.filter((c) => availCat.has(c.id))

    return NextResponse.json({ success: true, data: filtered })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUBLIC][MENU][CATEGORIES+RID]', err)
    }
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
