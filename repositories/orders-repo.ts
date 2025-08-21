import admin from '@/lib/firebase/admin'

const COLLECTION = 'orders'

export interface OrderRecord { id: number; account_id: number; status: string; table_id?: number; updated_at?: string; last_status_at?: string; daily_number?: number; pushed_statuses?: string[] }

export async function getOrder(id: number){
  const snap = await admin.firestore().collection(COLLECTION).doc(String(id)).get()
  if (!snap.exists) return null
  return snap.data() as OrderRecord
}

export async function getOrderItems(orderId: number){
  const snap = await admin.firestore().collection('order_items').where('order_id','==', orderId).get()
  return snap.docs.map(d=>d.data())
}
