import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'

// POST /api/admin/settings/logo - Upload restaurant logo
export async function POST(req: NextRequest) {
  try {
  // Require authenticated admin session
  const sess = await requireSession()
  if (sess.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

  const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ success: false, error: 'Account missing' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('logo') as File
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Upload to Cloudinary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { v2: cloudinary } = await import('cloudinary') as any
      
      // Configure Cloudinary (you need to set these environment variables)
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })

      // Upload to Cloudinary with restaurant-specific folder
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `restaurants/${accountId}/logos`,
            public_id: `logo_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: 'limit' },
              { quality: 'auto' },
              { format: 'auto' }
            ],
            overwrite: true
          },
          (error: unknown, result?: { secure_url: string }) => {
            if (error) reject(error)
            else if (result) resolve(result)
            else reject(new Error('Upload failed'))
          }
        ).end(buffer)
      })

      const logoUrl = uploadResult.secure_url

      // Update system settings with new logo URL
      const db = admin.firestore()
      const settingsSnap = await db.collection('system_settings')
        .where('account_id', '==', accountId)
        .limit(1)
        .get()

      const now = new Date().toISOString()

      if (!settingsSnap.empty) {
        // Update existing
        await db.collection('system_settings')
          .doc(settingsSnap.docs[0].id)
          .update({
            logo_url: logoUrl,
            updated_at: now
          })
      } else {
        // Create new system settings
        const { nextSequence } = await import('@/lib/firebase/sequences')
        const settingsId = await nextSequence('system_settings')
        await db.collection('system_settings').doc(String(settingsId)).set({
          id: settingsId,
          account_id: accountId,
          language: 'ar',
          currency: 'DZD',
          tax: 0,
          logo_url: logoUrl,
          created_at: now,
          updated_at: now,
        })
      }

      return NextResponse.json({ 
        success: true, 
        data: { 
          logo_url: logoUrl,
          updated_at: now
        } 
      })

    } catch (uploadError) {
      console.error('Logo upload error:', uploadError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload logo. Please try again.' 
      }, { status: 500 })
    }

  } catch (err) {
    return handleError(err, 'POST')
  }
}

interface AppError {
  status?: number
}

function handleError(err: unknown, op: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API][ADMIN][SETTINGS][LOGO][${op}]`, err)
  }
  const status = (err as AppError | undefined)?.status ?? 500
  const message = status === 401 ? 'Unauthenticated' : 'Server error'
  return NextResponse.json({ success: false, error: message }, { status })
}
