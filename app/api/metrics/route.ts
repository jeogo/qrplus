import { NextResponse } from 'next/server'
import { metricsSnapshot } from '@/lib/observability/metrics'
import { requirePermission } from '@/lib/auth/session'
import { toErrorResponse } from '@/lib/api/error-handler'

export const runtime = 'nodejs'

export async function GET(){
  try {
    await requirePermission('analytics','read') // admin only
    const body = await metricsSnapshot()
    return new NextResponse(body, { status: 200, headers: { 'Content-Type':'text/plain; version=0.0.4' } })
  } catch (err) {
    const { status, body } = toErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
