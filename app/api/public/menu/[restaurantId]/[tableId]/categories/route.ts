import { NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { resolveTable } from '@/lib/tables/resolve-table'

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

  const resolved = await resolveTable(restaurantIdNum, tableIdNum)
  if (!resolved) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })

    // جلب كل التصنيفات الفعّالة (حتى لو لا توجد منتجات متاحة حاليا) لعرضها ثم إظهار المنتجات بحالتها (متوفر / غير متوفر)
    const catSnap = await db
      .collection('categories')
      .where('account_id', '==', restaurantIdNum)
      .where('active', '==', true)
      .orderBy('name')
      .get()

    const categories = catSnap.docs.map((d) => d.data())
    return NextResponse.json({ success: true, data: categories })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUBLIC][MENU][CATEGORIES+RID]', err)
    }
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
