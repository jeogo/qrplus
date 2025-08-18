import * as admin from 'firebase-admin'

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY
const databaseURL = process.env.FIREBASE_DATABASE_URL

// Basic validation & helpful warnings (do not crash build; features that rely on RTDB will just skip)
if (!projectId || !clientEmail || !privateKeyRaw) {
  console.warn('[FirebaseAdmin] Missing one of FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. Admin features may fail.')
}
if (!databaseURL) {
  console.warn('[FirebaseAdmin] FIREBASE_DATABASE_URL not set. Realtime Database mirroring will log errors until configured.')
}

const firebaseAdminConfig = {
  projectId,
  clientEmail,
  privateKey: privateKeyRaw?.replace(/\\n/g, '\n'),
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount),
    projectId,
    // Only include databaseURL if provided to avoid "Can't determine" errors stemming from undefined
    ...(databaseURL ? { databaseURL } : {}),
  })
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
export const adminStorage = admin.storage()
export default admin
