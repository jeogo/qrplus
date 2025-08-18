import admin from './admin'

/**
 * Generate the next numeric sequence value for a named sequence via Firestore transaction.
 */
export async function nextSequence(name: string): Promise<number> {
  const db = admin.firestore()
  const ref = db.collection('_sequences').doc(name)
  const value = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    let current = 0
    if (snap.exists) {
      const data = snap.data() as { value?: number }
      current = typeof data.value === 'number' ? data.value : 0
    }
    const next = current + 1
    tx.set(ref, { value: next }, { merge: true })
    return next
  })
  return value
}
