import admin from '@/lib/firebase/admin'

// Generate next daily order number starting at 1 each UTC day per account.
export async function nextDailySequence(accountId: number, dateKey: string): Promise<number> {
  const db = admin.firestore()
  const ref = db.collection('_daily_sequences').doc(`${accountId}_${dateKey}`)
  const value = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    let current = 0
    if (snap.exists) {
      const data = snap.data() as { value?: number }
      current = typeof data.value === 'number' ? data.value : 0
    }
    const next = current + 1
    tx.set(ref, { value: next, date: dateKey, account_id: accountId, updated_at: new Date().toISOString() }, { merge: true })
    return next
  })
  return value
}

export function getUtcDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0,10)
}
