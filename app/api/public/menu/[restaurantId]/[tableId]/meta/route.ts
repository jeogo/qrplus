import { NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/menu/:restaurantId/:tableId/meta
export async function GET(_req: Request, { params }: { params: { restaurantId: string; tableId: string } }) {
  try {
    const restaurantIdNum = Number(params.restaurantId)
    const tableIdNum = Number(params.tableId)
    if (!Number.isInteger(restaurantIdNum) || !Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success:false, error:'NOT_FOUND' }, { status:404 })
    }
    const db = admin.firestore()
    const accountSnap = await db.collection('accounts').doc(String(restaurantIdNum)).get()
    if (!accountSnap.exists) return NextResponse.json({ success:false, error:'RESTAURANT_NOT_FOUND' }, { status:404 })
    const accountData = accountSnap.data()!
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) return NextResponse.json({ success:false, error:'TABLE_NOT_FOUND' }, { status:404 })
    const tableData = tableSnap.data()!
    if (tableData.account_id !== restaurantIdNum) return NextResponse.json({ success:false, error:'MISMATCH' }, { status:404 })

    const settingsSnap = await db.collection('system_settings').where('account_id','==',restaurantIdNum).limit(1).get()
    let settingsData: { logo_url?: string; language?: 'ar' | 'fr'; currency?: string } = {}
    if (!settingsSnap.empty) settingsData = settingsSnap.docs[0].data()

    const data = {
      restaurant_name: accountData.name || '',
      logo_url: settingsData.logo_url || '',
      currency: (settingsData.currency || 'DZD') as 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD',
      language: (settingsData.language || 'ar') as 'ar' | 'fr',
      address: accountData.address || '',
      phone: accountData.phone || ''
    }
    return NextResponse.json({ success:true, data })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[PUBLIC][MENU][META+RID]', err)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}
