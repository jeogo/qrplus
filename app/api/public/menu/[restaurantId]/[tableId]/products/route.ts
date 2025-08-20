import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/menu/:restaurantId/:tableId/products?category_id=ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ restaurantId: string; tableId: string }> }
) {
  try {
    // ✅ ننتظر الـ params
    const { restaurantId, tableId } = await context.params

    const restaurantIdNum = Number(restaurantId)
    const tableIdNum = Number(tableId)

    // التحقق من أرقام المطعم والطاولة
    if (!Number.isInteger(restaurantIdNum) || !Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const categoryIdRaw = searchParams.get('category_id')

    if (!categoryIdRaw) {
      return NextResponse.json({ success: false, error: 'category_id required' }, { status: 400 })
    }

    const categoryId = Number(categoryIdRaw)
    if (!Number.isInteger(categoryId)) {
      return NextResponse.json({ success: false, error: 'INVALID_CATEGORY' }, { status: 400 })
    }

    const db = admin.firestore()

    // تحقق من المطعم
    const accountSnap = await db.collection('accounts').doc(String(restaurantIdNum)).get()
    if (!accountSnap.exists) {
      return NextResponse.json({ success: false, error: 'RESTAURANT_NOT_FOUND' }, { status: 404 })
    }

    // تحقق من الطاولة
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }
    const tableData = tableSnap.data()!
    if (tableData.account_id !== restaurantIdNum) {
      return NextResponse.json({ success: false, error: 'MISMATCH' }, { status: 404 })
    }

    // تحقق من الفئة (Category)
    const catSnap = await db.collection('categories').doc(String(categoryId)).get()
    if (!catSnap.exists) {
      return NextResponse.json({ success: false, error: 'CATEGORY_NOT_FOUND' }, { status: 404 })
    }
    const catData = catSnap.data()!
    if (catData.account_id !== restaurantIdNum || catData.active !== true) {
      return NextResponse.json({ success: false, error: 'CATEGORY_NOT_FOUND' }, { status: 404 })
    }

    // جلب كل المنتجات في التصنيف (مع حالة التوفر)
    const prodSnap = await db
      .collection('products')
      .where('account_id', '==', restaurantIdNum)
      .where('category_id', '==', categoryId)
      .orderBy('name')
      .get()

    interface ProductDoc {
      id: number
      name?: string
      name_ar?: string
      name_fr?: string
      description?: string
      description_ar?: string
      description_fr?: string
      price: number | string
      image_url?: string
      available?: boolean
      account_id: number
      created_at?: string
      updated_at?: string
    }
    const products = prodSnap.docs.map(d => {
      const data = d.data() as ProductDoc
      // دعم تعدد اللغات (الاسمين) إن وُجِدا
      const name = data.name_ar || data.name_fr || data.name || ''
      const description = data.description_ar || data.description_fr || data.description || ''
      return {
        id: data.id,
        name,
        name_ar: data.name_ar || name,
        name_fr: data.name_fr || name,
        description,
        price: Number(data.price),
        image_url: data.image_url || '',
        available: data.available === undefined ? true : !!data.available,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    })

    return NextResponse.json({ success: true, data: products })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUBLIC][MENU][PRODUCTS+RID]', err)
    }
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
