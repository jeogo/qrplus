import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requirePermission } from '@/lib/auth/session'
import { parseJsonBody } from '@/lib/validation/parse'
import { settingsUpdateSchema } from '@/schemas/settings'

interface SettingsData {
  id: number
  account_id: number
  restaurant_name: string
  logo_url?: string
  language: 'ar' | 'fr' | 'en'
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
  language?: 'ar' | 'fr' | 'en'
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

// GET /api/admin/settings - Fetch restaurant & system settings
export async function GET() {
  try {
  const sess = await requirePermission('settings','read')

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })

    const db = admin.firestore()
    const accountSnap = await db.collection('accounts').doc(String(accountId)).get()
    if (!accountSnap.exists) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    const accountData = accountSnap.data()!

    const settingsSnap = await db.collection('system_settings').where('account_id', '==', accountId).limit(1).get()
    const settingsData: SystemSettingsData = !settingsSnap.empty ? settingsSnap.docs[0].data() : { language: 'ar', currency: 'DZD', logo_url: '' }

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

// PATCH /api/admin/settings - Update restaurant & system settings
export async function PATCH(req: NextRequest) {
  try {
    const sess = await requirePermission('settings','update')
  const { data, response } = await parseJsonBody(req, settingsUpdateSchema)
  if (response) return response
  if (!data) return NextResponse.json({ success:false, error:'Invalid body' }, { status:400 })
  const body = data

    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })

    const now = new Date().toISOString()
    const db = admin.firestore()
    const accountUpdates: Partial<AccountData> & { updated_at: string } = { updated_at: now }
    const systemSettingsUpdates: Partial<SystemSettingsData> & { updated_at: string } = { updated_at: now }

    if (body.restaurant_name !== undefined) accountUpdates.name = body.restaurant_name
    if (body.system_active !== undefined) accountUpdates.active = body.system_active
    if (body.address !== undefined) accountUpdates.address = body.address || ''
    if (body.phone !== undefined) accountUpdates.phone = body.phone || ''
    if (body.email !== undefined) accountUpdates.email = body.email || ''
    if (body.language !== undefined) systemSettingsUpdates.language = body.language
    if (body.currency !== undefined) systemSettingsUpdates.currency = body.currency
    if (body.logo_url !== undefined) systemSettingsUpdates.logo_url = body.logo_url || ''

    const hasAccountChanges = Object.keys(accountUpdates).length > 1
    const hasSystemChanges = Object.keys(systemSettingsUpdates).length > 1
    if (!hasAccountChanges && !hasSystemChanges) {
      return NextResponse.json({ success: true, data: { noop: true } }, { status: 204 })
    }
    if (hasAccountChanges) await db.collection('accounts').doc(String(accountId)).update(accountUpdates)
    if (hasSystemChanges) {
      const settingsSnap = await db.collection('system_settings').where('account_id', '==', accountId).limit(1).get()
      if (!settingsSnap.empty) {
        await db.collection('system_settings').doc(settingsSnap.docs[0].id).update(systemSettingsUpdates)
      } else {
        const { nextSequence } = await import('@/lib/firebase/sequences')
        const settingsId = await nextSequence('system_settings')
        await db.collection('system_settings').doc(String(settingsId)).set({
          id: settingsId,
          account_id: accountId,
          language: body.language || 'ar',
          currency: body.currency || 'DZD',
          logo_url: body.logo_url || '',
          created_at: now,
          ...systemSettingsUpdates
        })
      }
    }

    const updatedAccountSnap = await db.collection('accounts').doc(String(accountId)).get()
    const updatedAccountData = updatedAccountSnap.data()!
    const updatedSettingsSnap = await db.collection('system_settings').where('account_id', '==', accountId).limit(1).get()
    const updatedSettingsData: SystemSettingsData = !updatedSettingsSnap.empty ? updatedSettingsSnap.docs[0].data() : { language: 'ar', currency: 'DZD', logo_url: '' }

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

// Error handler
interface AppError { status?: number }
function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') console.error(`[API][ADMIN][SETTINGS][${op}]`, err)
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : (status===400? 'Bad request' : 'Server error')
  return NextResponse.json({ success: false, error: message }, { status })
}
