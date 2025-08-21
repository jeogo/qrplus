import admin from '@/lib/firebase/admin'

export interface ResolvedTable { id: number; table_number?: number }

// Resolves a table given an account and a user-supplied id which can be either
// the internal numeric document id or the dense public table_number.
// Returns null if not found or mismatched account.
export async function resolveTable(accountId: number, suppliedId: number): Promise<ResolvedTable | null> {
  if (!Number.isInteger(accountId) || !Number.isInteger(suppliedId)) return null
  const db = admin.firestore()
  const direct = await db.collection('tables').doc(String(suppliedId)).get()
  if (direct.exists) {
    const data = direct.data() as { account_id?: number; table_number?: number }
    if (data.account_id === accountId) return { id: suppliedId, table_number: data.table_number }
  }
  // fallback lookup by table_number
  const alt = await db.collection('tables')
    .where('account_id','==',accountId)
    .where('table_number','==', suppliedId)
    .limit(1)
    .get()
  if (alt.empty) return null
  const doc = alt.docs[0]
  const data = doc.data() as { table_number?: number }
  const idNum = Number(doc.id)
  return { id: Number.isInteger(idNum) ? idNum : suppliedId, table_number: data.table_number }
}
