import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/menu/:restaurantId/:tableId/products?category_id=ID
export async function GET(req: NextRequest, { params }: { params: { restaurantId: string; tableId: string } }) {
  try {
    const restaurantIdNum = Number(params.restaurantId)
    const tableIdNum = Number(params.tableId)
    if (!Number.isInteger(restaurantIdNum) || !Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success:false, error:'NOT_FOUND' }, { status:404 })
    }
    const { searchParams } = new URL(req.url)
    const categoryIdRaw = searchParams.get('category_id')
    if (!categoryIdRaw) return NextResponse.json({ success:false, error:'category_id required' }, { status:400 })
    const categoryId = Number(categoryIdRaw)
    if (!Number.isInteger(categoryId)) return NextResponse.json({ success:false, error:'INVALID_CATEGORY' }, { status:400 })
    const db = admin.firestore()
    const accountSnap = await db.collection('accounts').doc(String(restaurantIdNum)).get()
    if (!accountSnap.exists) return NextResponse.json({ success:false, error:'RESTAURANT_NOT_FOUND' }, { status:404 })
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) return NextResponse.json({ success:false, error:'TABLE_NOT_FOUND' }, { status:404 })
    const tableData = tableSnap.data()!
    if (tableData.account_id !== restaurantIdNum) return NextResponse.json({ success:false, error:'MISMATCH' }, { status:404 })
    const catSnap = await db.collection('categories').doc(String(categoryId)).get()
    if (!catSnap.exists) return NextResponse.json({ success:false, error:'CATEGORY_NOT_FOUND' }, { status:404 })
    const catData = catSnap.data()!
    if (catData.account_id !== restaurantIdNum || catData.active !== true) return NextResponse.json({ success:false, error:'CATEGORY_NOT_FOUND' }, { status:404 })
    const prodSnap = await db.collection('products')
      .where('account_id','==',restaurantIdNum)
      .where('category_id','==',categoryId)
      .where('available','==',true)
      .orderBy('name')
      .get()
    const products = prodSnap.docs.map(d=>d.data())
    return NextResponse.json({ success:true, data: products })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[PUBLIC][MENU][PRODUCTS+RID]', err)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}
