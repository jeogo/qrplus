import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

interface SettingsData {
  id: number
  account_id: number
  restaurant_name: string
  logo_url?: string
  language: 'ar' | 'fr'
  currency: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD'
  address?: string
  phone?: string
  email?: string
  system_active: boolean
  created_at: string
  updated_at: string
}

interface SystemSettingsData {
  id?: number
  account_id?: number
  language?: 'ar' | 'fr'
  currency?: 'USD' | 'EUR' | 'MAD' | 'TND' | 'DZD'
  logo_url?: string
  created_at?: string
  updated_at?: string
}

interface AccountData {
  id?: number
  name?: string
  email?: string
  address?: string
  phone?: string
  active?: boolean
  created_at?: string
  updated_at?: string
}

// GET /api/admin/settings - Get restaurant settings
export async function GET() {
  try {
    const sess = requireSession()
    if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const db = admin.firestore()

    // Get restaurant info from accounts collection
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    }
    const accountData = accountSnap.data()!

    // Get system settings
    const settingsSnap = await db.collection('system_settings')
      .where('account_id', '==', accountId)
      .limit(1)
      .get()

    let settingsData: SystemSettingsData = {
      language: 'ar',
      currency: 'DZD',
      logo_url: '',
    }

    if (!settingsSnap.empty) {
      settingsData = settingsSnap.docs[0].data()
    }

    const settings: SettingsData = {
      id: settingsData.id || accountId,
      account_id: accountId,
      restaurant_name: accountData.name || '',
      logo_url: settingsData.logo_url || '',
      language: settingsData.language || 'ar',
      currency: settingsData.currency || 'DZD',
      address: accountData.address || '',
      phone: accountData.phone || '',
      email: accountData.email || '',
      system_active: accountData.active !== false,
      created_at: settingsData.created_at || accountData.created_at || new Date().toISOString(),
      updated_at: settingsData.updated_at || accountData.updated_at || new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (err) {
    return handleError(err, 'GET')
  }
}

// PATCH /api/admin/settings - Update restaurant settings
export async function PATCH(req: NextRequest) {
  try {
    const sess = requireSession()
    if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const body = await req.json()
    const now = new Date().toISOString()
    const db = admin.firestore()

    // Prepare updates for different collections
    const accountUpdates: Partial<AccountData> & { updated_at: string } = { updated_at: now }
    const systemSettingsUpdates: Partial<SystemSettingsData> & { updated_at: string } = { updated_at: now }

    // Handle restaurant name (goes to accounts)
    if (body.restaurant_name !== undefined) {
      const name = String(body.restaurant_name).trim()
      if (!name) {
        return NextResponse.json({ success: false, error: 'Restaurant name required' }, { status: 400 })
      }
      accountUpdates.name = name
    }

    // Handle system active status (goes to accounts)
    if (body.system_active !== undefined) {
      accountUpdates.active = Boolean(body.system_active)
    }

    // Handle contact info (goes to accounts)
    if (body.address !== undefined) {
      accountUpdates.address = body.address ? String(body.address).trim() : ''
    }
    if (body.phone !== undefined) {
      accountUpdates.phone = body.phone ? String(body.phone).trim() : ''
    }
    if (body.email !== undefined) {
      accountUpdates.email = body.email ? String(body.email).trim() : ''
    }

    // Handle system settings (goes to system_settings)
    if (body.language !== undefined) {
      if (!['ar', 'fr'].includes(body.language)) {
        return NextResponse.json({ success: false, error: 'Invalid language' }, { status: 400 })
      }
      systemSettingsUpdates.language = body.language
    }

    if (body.currency !== undefined) {
      if (!['USD', 'EUR', 'MAD', 'TND', 'DZD'].includes(body.currency)) {
        return NextResponse.json({ success: false, error: 'Invalid currency' }, { status: 400 })
      }
      systemSettingsUpdates.currency = body.currency
    }

  // (tax removed)

    if (body.logo_url !== undefined) {
      systemSettingsUpdates.logo_url = body.logo_url ? String(body.logo_url).trim() : ''
    }

    // Update accounts if needed
    if (Object.keys(accountUpdates).length > 1) { // More than just updated_at
      await db.collection('accounts').doc(String(accountId)).update(accountUpdates)
    }

    // Update system settings if needed
    if (Object.keys(systemSettingsUpdates).length > 1) { // More than just updated_at
      const settingsSnap = await db.collection('system_settings')
        .where('account_id', '==', accountId)
        .limit(1)
        .get()

      if (!settingsSnap.empty) {
        // Update existing
        await db.collection('system_settings')
          .doc(settingsSnap.docs[0].id)
          .update(systemSettingsUpdates)
      } else {
        // Create new system settings
        const { nextSequence } = await import('@/lib/firebase/sequences')
        const settingsId = await nextSequence('system_settings')
        await db.collection('system_settings').doc(String(settingsId)).set({
          id: settingsId,
          account_id: accountId,
          language: 'ar',
          currency: 'DZD',
          logo_url: '',
          created_at: now,
          ...systemSettingsUpdates
        })
      }
    }

    // Return updated data
    const updatedAccountSnap = await db.collection('accounts').doc(String(accountId)).get()
    const updatedAccountData = updatedAccountSnap.data()!

    const updatedSettingsSnap = await db.collection('system_settings')
      .where('account_id', '==', accountId)
      .limit(1)
      .get()

    let updatedSettingsData: SystemSettingsData = {
      language: 'ar',
      currency: 'DZD',
      logo_url: '',
    }

    if (!updatedSettingsSnap.empty) {
      updatedSettingsData = updatedSettingsSnap.docs[0].data()
    }

    const settings: SettingsData = {
      id: updatedSettingsData.id || accountId,
      account_id: accountId,
      restaurant_name: updatedAccountData.name || '',
      logo_url: updatedSettingsData.logo_url || '',
      language: updatedSettingsData.language || 'ar',
      currency: updatedSettingsData.currency || 'DZD',
      address: updatedAccountData.address || '',
      phone: updatedAccountData.phone || '',
      email: updatedAccountData.email || '',
      system_active: updatedAccountData.active !== false,
      created_at: updatedSettingsData.created_at || updatedAccountData.created_at || new Date().toISOString(),
      updated_at: now,
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (err) {
    return handleError(err, 'PATCH')
  }
}

interface AppError {
  status?: number
}

function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][ADMIN][SETTINGS][${op}]`, err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
