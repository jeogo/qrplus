import admin from '@/lib/firebase/admin'

export type ArchiveReason = 'served' | 'cancelled'

/**
 * Archives an order (and its items) into `orders_archive` collection then deletes original docs.
 * Idempotent: if order already missing, resolves gracefully.
 */
export async function archiveOrder(accountId: number, orderId: number, reason: ArchiveReason) {
  const db = admin.firestore()
  const orderRef = db.collection('orders').doc(String(orderId))
  const snap = await orderRef.get()
  if (!snap.exists) return { skipped: true }
  const orderData = snap.data()!
  if (orderData.account_id !== accountId) throw new Error('ORDER_NOT_FOUND')

  const itemsSnap = await db.collection('order_items').where('order_id', '==', orderId).get()
  const now = new Date().toISOString()

  const batch = db.batch()
  // Archive order
  const archiveOrderRef = db.collection('orders_archive').doc(String(orderId))
  batch.set(archiveOrderRef, {
    ...orderData,
    archived_at: now,
    archive_reason: reason,
  })
  // Archive items
  itemsSnap.docs.forEach(d => {
    const it = d.data()
    const archItemRef = db.collection('order_items_archive').doc(String(it.id))
    batch.set(archItemRef, { ...it, archived_at: now, archive_reason: reason })
    batch.delete(d.ref)
  })
  // Delete original order
  batch.delete(orderRef)

  await batch.commit()
  return { archived: true, reason }
}
