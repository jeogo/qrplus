import { NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/menu/:tableId/meta -> restaurant branding & display metadata
// Returns: { success, data: { restaurant_name, logo_url, currency, language, address, phone } }
export async function GET(_req: Request, { params }: { params: { tableId: string } }) {
  try {
    const tableIdNum = Number(params.tableId)
    if (!Number.isInteger(tableIdNum)) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }
    const db = admin.firestore()
    const tableSnap = await db.collection('tables').doc(String(tableIdNum)).get()
    if (!tableSnap.exists) {
      return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }
    const tableData = tableSnap.data()!
    const accountId = tableData.account_id

    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists) {
      return NextResponse.json({ success: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 404 })
    }
    const accountData = accountSnap.data()!

    // system_settings (logo, language, currency)
    const settingsSnap = await db.collection('system_settings')
      .where('account_id','==',accountId)
      .limit(1)
      .get()
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
    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[PUBLIC][MENU][META]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
