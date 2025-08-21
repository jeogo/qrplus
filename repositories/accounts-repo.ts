import admin from '@/lib/firebase/admin'

export async function isAccountActive(id: number){
  const snap = await admin.firestore().collection('accounts').doc(String(id)).get()
  if (!snap.exists) return false
  return snap.data()?.active !== false
}
