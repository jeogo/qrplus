import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// Public products for a table filtered by category (required) only available products
export async function GET(req: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const tableIdNum = Number(params.tableId)
    if (!Number.isInteger(tableIdNum)) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    const { searchParams } = new URL(req.url)
    const categoryIdRaw = searchParams.get('category_id')
    if (!categoryIdRaw) return NextResponse.json({ success: false, error: 'category_id required' }, { status: 400 })
    const categoryId = Number(categoryIdRaw)
    if (!Number.isInteger(categoryId)) return NextResponse.json({ success: false, error: 'INVALID_CATEGORY' }, { status: 400 })
    const db = admin.firestore()
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    const tableData = tableSnap.data()!
    const accountId = tableData.account_id
    // verify category belongs to account and active
    const catSnap = await db.collection('categories').doc(String(categoryId)).get()
    if (!catSnap.exists) return NextResponse.json({ success: false, error: 'CATEGORY_NOT_FOUND' }, { status: 404 })
    const catData = catSnap.data()!
    if (catData.account_id !== accountId || catData.active !== true) return NextResponse.json({ success: false, error: 'CATEGORY_NOT_FOUND' }, { status: 404 })
    // fetch products
    const prodSnap = await db.collection('products')
      .where('account_id','==',accountId)
      .where('category_id','==',categoryId)
      .where('available','==',true)
      .orderBy('name')
      .get()
    const products = prodSnap.docs.map(d=>d.data())
    return NextResponse.json({ success: true, data: products })
  } catch (err) {
    console.error('[PUBLIC][MENU][PRODUCTS]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
