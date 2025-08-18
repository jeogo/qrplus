import { getDatabase } from 'firebase-admin/database'

interface MinimalOrderForMirror {
  id: number
  table_id: number
  status: string
  total?: number
  created_at?: string
  updated_at?: string
  last_status_at?: string
  note?: string
}

function hasRTDB() {
  return !!process.env.FIREBASE_DATABASE_URL
}

export async function mirrorOrderCreate(accountId: number, order: MinimalOrderForMirror) {
  if (!hasRTDB()) return
  try {
    const db = getDatabase()
    const { id, table_id, status, total, created_at, updated_at, last_status_at, note } = order
    // Strip undefined values to prevent RTDB validation error
    const cleanData: Record<string, string | number> = { id, table_id, status }
    if (total !== undefined) cleanData.total = total
    if (created_at !== undefined) cleanData.created_at = created_at
    if (updated_at !== undefined) cleanData.updated_at = updated_at
    if (last_status_at !== undefined) cleanData.last_status_at = last_status_at
    if (note !== undefined) cleanData.note = note
    
    await db.ref(`accounts/${accountId}/orders/${id}`).set(cleanData)
    await db.ref(`accounts/${accountId}/tables/${table_id}`).update({ active_order_id: id })
  } catch (e) { console.error('[RTDB][MIRROR][CREATE]', e) }
}

export async function mirrorOrderUpdate(accountId: number, order: MinimalOrderForMirror) {
  if (!hasRTDB()) return
  try {
    const db = getDatabase()
    const { id, status, updated_at, last_status_at } = order
    const updateData: Record<string, string | number> = { status }
    if (updated_at !== undefined) updateData.updated_at = updated_at
    if (last_status_at !== undefined) updateData.last_status_at = last_status_at
    
    await db.ref(`accounts/${accountId}/orders/${id}`).update(updateData)
  } catch (e) { console.error('[RTDB][MIRROR][UPDATE]', e) }
}

export async function mirrorOrderServe(accountId: number, order: MinimalOrderForMirror) {
  if (!hasRTDB()) return
  try {
    const db = getDatabase()
    const { id, table_id, status, updated_at, last_status_at } = order
    const updateData: Record<string, string | number> = { status }
    if (updated_at !== undefined) updateData.updated_at = updated_at
    if (last_status_at !== undefined) updateData.last_status_at = last_status_at
    
    await db.ref(`accounts/${accountId}/orders/${id}`).update(updateData)
    await db.ref(`accounts/${accountId}/tables/${table_id}`).update({ active_order_id: null })
  } catch (e) { console.error('[RTDB][MIRROR][SERVE]', e) }
}

export async function mirrorOrderDelete(accountId: number, orderId: number, tableId: number) {
  if (!hasRTDB()) {
    console.log('[RTDB][MIRROR][DELETE] Skipped - no database URL')
    return
  }
  try {
    console.log(`[RTDB][MIRROR][DELETE] Starting: order=${orderId}, table=${tableId}, account=${accountId}`)
    const db = getDatabase()
    
    // Clear active order pointer FIRST (immediate client notification)
    await db.ref(`accounts/${accountId}/tables/${tableId}`).update({ active_order_id: null })
    console.log(`[RTDB][MIRROR][DELETE] Cleared active_order_id for table ${tableId}`)
    
    // Remove order data
    await db.ref(`accounts/${accountId}/orders/${orderId}`).remove()
    console.log(`[RTDB][MIRROR][DELETE] Removed order ${orderId} data`)
    
    console.log(`[RTDB][MIRROR][DELETE] Completed successfully for order ${orderId}`)
  } catch (e) { 
    console.error('[RTDB][MIRROR][DELETE] Error:', e)
  }
}
