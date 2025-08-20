// Deprecated: bulk-ready endpoint removed. Returns 410 Gone to signal clients to stop using it.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ success:false, error:'REMOVED_ENDPOINT' }, { status:410 })
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
