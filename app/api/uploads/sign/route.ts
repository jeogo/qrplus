import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { generateCloudinarySignature } from '@/lib/cloudinary'

export async function GET(req: NextRequest) {
  try {
    requireSession()
    const { searchParams } = new URL(req.url)
    const folder = searchParams.get('folder') || 'menu'
    const sig = generateCloudinarySignature({ folder })
    return NextResponse.json({ success: true, data: sig })
  } catch (err) {
    console.error('[API][UPLOADS][SIGN] error', err)
    return NextResponse.json({ success: false, error: 'Cannot sign' }, { status: 500 })
  }
}
