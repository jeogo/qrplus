import { NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { resolveTable } from '@/lib/tables/resolve-table'

// GET /api/public/menu/:restaurantId/:tableId/meta
export async function GET(
  _req: Request,
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

    const db = admin.firestore()

    // تحقق من المطعم
    const accountSnap = await db.collection('accounts').doc(String(restaurantIdNum)).get()
    if (!accountSnap.exists) {
      return NextResponse.json({ success: false, error: 'RESTAURANT_NOT_FOUND' }, { status: 404 })
    }
    const accountData = accountSnap.data()!

  const resolved = await resolveTable(restaurantIdNum, tableIdNum)
  if (!resolved) return NextResponse.json({ success: false, error: 'TABLE_NOT_FOUND' }, { status: 404 })
  const table_number = resolved.table_number

    // جلب إعدادات النظام
    const settingsSnap = await db
      .collection('system_settings')
      .where('account_id', '==', restaurantIdNum)
      .limit(1)
      .get()

  let settingsData: { logo_url?: string; language?: 'ar' | 'fr' | 'en'; currency?: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD' } = {}

    if (!settingsSnap.empty) {
      const docData = settingsSnap.docs[0].data()
      settingsData = {
        logo_url: docData.logo_url || '',
        language: docData.language === 'fr' ? 'fr' : 'ar', // default ar
        currency: ['USD', 'EUR', 'MAD', 'TND', 'DZD'].includes(docData.currency) ? docData.currency : 'DZD',
      }
    }

    const data = {
      restaurant_name: accountData.name || '',
      logo_url: settingsData.logo_url || '',
      currency: settingsData.currency || 'DZD',
      language: settingsData.language || 'ar',
      address: accountData.address || '',
      phone: accountData.phone || '',
      table_number: typeof table_number === 'number' ? table_number : undefined,
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUBLIC][MENU][META+RID]', err)
    }
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
