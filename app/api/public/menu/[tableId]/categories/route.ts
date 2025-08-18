import { NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// Public categories for a table (no auth) -> only active categories that have at least one available product
export async function GET(_req: Request, { params }: { params: { tableId: string } }) {
  try {
    const tableIdNum = Number(params.tableId)
    if (!Number.isInteger(tableIdNum)) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    const db = admin.firestore()
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    const tableData = tableSnap.data()!
    const accountId = tableData.account_id
    // fetch active categories
    const catSnap = await db.collection('categories').where('account_id','==',accountId).where('active','==',true).orderBy('name').get()
    const categories = catSnap.docs.map(d=>d.data())
    if (!categories.length) return NextResponse.json({ success: true, data: [] })
    // For performance we could aggregate counts; for now fetch available products category ids
    const prodSnap = await db.collection('products').where('account_id','==',accountId).where('available','==',true).get()
    const availCat = new Set(prodSnap.docs.map(d=>d.data().category_id))
    const filtered = categories.filter(c => availCat.has(c.id))
    return NextResponse.json({ success: true, data: filtered })
  } catch (err) {
    console.error('[PUBLIC][MENU][CATEGORIES]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
