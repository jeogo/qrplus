import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/session'
import admin from '@/lib/firebase/admin'
import { validateTransition } from '@/lib/order-status'
import { mirrorOrderUpdate } from '@/lib/mirror'
import { sendOrderReadyPush } from '@/lib/notifications/push-sender'

// POST /api/orders/:id/ready  (kitchen/admin) transition approved -> ready
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
  const sess = await requirePermission('orders.ready','special')
    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum)) return NextResponse.json({ success:false, error:'ORDER_NOT_FOUND' }, { status:404 })
    const accountId = typeof sess.accountNumericId === 'number' ? sess.accountNumericId : Number(sess.accountId)
    const db = admin.firestore()
    const ref = db.collection('orders').doc(String(idNum))
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ success:false, error:'ORDER_NOT_FOUND' }, { status:404 })
    const data = snap.data()!
    if (data.account_id !== accountId) return NextResponse.json({ success:false, error:'ORDER_NOT_FOUND' }, { status:404 })
    const current: string = data.status
    if (!validateTransition(current,'ready')) return NextResponse.json({ success:false, error:'INVALID_TRANSITION' }, { status:409 })
    if (current !== 'approved') return NextResponse.json({ success:false, error:'FORBIDDEN_TRANSITION' }, { status:403 })
    const updated_at = new Date().toISOString()
    const last_status_at = updated_at
    await db.runTransaction(async tx => {
      const inside = await tx.get(ref)
      if (!inside.exists) throw new Error('ORDER_NOT_FOUND')
      const docData = inside.data() as { pushed_statuses?: string[]; daily_number?:number; table_id?:number }
      const pushed: string[] = Array.isArray(docData.pushed_statuses) ? docData.pushed_statuses : []
      const newlyAdded = !pushed.includes('ready')
      tx.update(ref,{ status:'ready', updated_at, last_status_at, pushed_statuses: newlyAdded? [...pushed,'ready']: pushed })
      ;(async()=>{ try { await mirrorOrderUpdate(accountId, { id:idNum, table_id: data.table_id, status:'ready', updated_at, last_status_at }); if (newlyAdded) await sendOrderReadyPush({ id:idNum, table_id:data.table_id, daily_number:data.daily_number, account_id:accountId }) } catch(e){ console.error('[READY][PUSH]',e) } })()
    })
    return NextResponse.json({ success:true, data:{ id:idNum, status:'ready', updated_at, last_status_at } })
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('[ORDER_READY]', e)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
