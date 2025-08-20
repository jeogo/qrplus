import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'
import { requireSession } from '@/lib/auth/session'
import type { OrdersSummaryResponse, OrderAnalyticsSummary, OrdersSummaryOrderRow } from '@/types/analytics'

// GET /api/admin/analytics/orders-summary?from=ISO&to=ISO
// Returns aggregated stats and raw orders (capped) for analytics dashboard
export async function GET(req: NextRequest) {
  try {
    const sess = await requireSession()
    if(sess.role !== 'admin') return NextResponse.json({ success:false, error:'Forbidden' }, { status:403 })
    const accountId = typeof sess.accountNumericId === 'number'? sess.accountNumericId : Number(sess.accountId)
    if(!Number.isFinite(accountId)) return NextResponse.json({ success:false, error:'Account missing' }, { status:400 })

    const { searchParams } = new URL(req.url)
    const fromIso = searchParams.get('from')
    const toIso = searchParams.get('to')
    const from = fromIso ? new Date(fromIso) : null
    const to = toIso ? new Date(toIso) : null

    if(fromIso && isNaN(from!.getTime())) return NextResponse.json({ success:false, error:'INVALID_FROM' }, { status:400 })
    if(toIso && isNaN(to!.getTime())) return NextResponse.json({ success:false, error:'INVALID_TO' }, { status:400 })

  const db = admin.firestore()
  const liveSnap = await db.collection('orders').where('account_id','==',accountId).get()

  interface FirestoreOrderRaw { id?:number; account_id?:number; table_id?:number; status?:string; total?:number; created_at?:unknown; updated_at?:unknown; daily_number?:number; archived_at?:unknown; }
  const archived: FirestoreOrderRaw[] = []
  try {
    const archSnap = await db.collection('orders_archive').where('account_id','==',accountId).get()
    for(const d of archSnap.docs) archived.push(d.data() as FirestoreOrderRaw)
  } catch(e){ if(process.env.NODE_ENV!=='production') console.warn('[ADMIN][ANALYTICS][ARCHIVE_FETCH_FAIL]', e) }

    type FirestoreTimestampLike = { toDate?: () => Date; seconds?: number; nanoseconds?: number } | string | null | undefined
    const toDate = (v: FirestoreTimestampLike): Date | null => {
      if(!v) return null
      if(typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function') return v.toDate()
      if(typeof v === 'object' && v !== null && 'seconds' in v && typeof (v as { seconds?: unknown }).seconds === 'number') {
        const ts = v as { seconds:number; nanoseconds?:number }
        return new Date(ts.seconds*1000 + Math.floor((ts.nanoseconds||0)/1e6))
      }
      if(typeof v === 'string') {
        const d = new Date(v); return isNaN(d.getTime())? null : d
      }
      return null
    }

  type RawOrder = FirestoreOrderRaw
  let rows: RawOrder[] = ([...liveSnap.docs.map(d=> d.data() as RawOrder), ...archived]).filter(r=> !!r)
  // (range filtering & mapping handled below)

  const mapped: OrdersSummaryOrderRow[] = (rows as RawOrder[]).map(r=>{
      const status = (r.status || 'unknown') as string
      const createdRaw = (r.created_at ?? r.archived_at) as FirestoreTimestampLike
      const createdAtDate = toDate(createdRaw)
      const updatedAtDate = toDate((r.updated_at ?? r.archived_at ?? createdRaw) as FirestoreTimestampLike)
      let serveDurationMin: number | undefined
      if(status==='served' && createdAtDate && updatedAtDate){
        serveDurationMin = Math.max(0,(updatedAtDate.getTime()-createdAtDate.getTime())/60000)
      }
      const result = {
        id: r.id,
        table_id: r.table_id,
        status,
        total: Number.isFinite(Number(r.total))? Number(r.total):0,
        created_at: createdAtDate? createdAtDate.toISOString(): undefined,
        updated_at: updatedAtDate? updatedAtDate.toISOString(): undefined,
        daily_number: r.daily_number,
        serve_duration_min: serveDurationMin,
        source: r.archived_at ? 'archived' as const : 'live' as const
      }
      return result
    })
    const filtered = mapped.filter(r=>{
      if(!r.created_at) return false
      if(from && new Date(r.created_at) < from) return false
      if(to && new Date(r.created_at) > to) return false
      return true
    })
  rows = filtered as unknown as RawOrder[]

    // Aggregate
  const totalOrders = rows.length
    const totalRevenue = rows.reduce((s,r)=> s + (r.total||0), 0)
    const averageOrderValue = totalOrders? totalRevenue / totalOrders : 0
    const statusCounts: Record<string, number> = {}
    const daily: Record<string,{ orders:number; revenue:number }> = {}
    let servedRevenue = 0
    let servedCount = 0
    let cancelledCount = 0
    let totalServeDuration = 0
    let servedWithDuration = 0
    const todayKey = new Date().toISOString().split('T')[0]
    let todayServedCount = 0
    let todayServedRevenue = 0
  for(const r of rows as { status:string; created_at?:string; total:number; serve_duration_min?:number }[]){
      statusCounts[r.status] = (statusCounts[r.status]||0)+1
      const day = r.created_at!.split('T')[0]
      if(!daily[day]) daily[day] = { orders:0, revenue:0 }
      daily[day].orders +=1
      daily[day].revenue += r.total||0
      if(r.status==='served'){
        servedCount++
        servedRevenue += r.total||0
        if(r.serve_duration_min!==undefined){ totalServeDuration += r.serve_duration_min; servedWithDuration++ }
        if(day===todayKey){ todayServedCount++; todayServedRevenue += r.total||0 }
      } else if(r.status==='cancelled') cancelledCount++
    }
  const archivedCount = (rows as { source?:string }[]).filter(r=> r.source==='archived').length
    const averageServeMinutes = servedWithDuration? totalServeDuration/servedWithDuration : null
    const dailyStats = Object.entries(daily).map(([date,val])=> ({ date, ...val })).sort((a,b)=> new Date(a.date).getTime()-new Date(b.date).getTime())

    const summary: OrderAnalyticsSummary = { totalOrders, totalRevenue, averageOrderValue, statusCounts, dailyStats, servedRevenue, servedCount, cancelledCount, averageServeMinutes, todayServedCount, todayServedRevenue, archivedCount }
    const debugFlag = searchParams.get('debug')==='1'
    const payload: OrdersSummaryResponse = {
      summary,
      orders: (rows as unknown as OrdersSummaryOrderRow[]).slice(0,500),
      debug: debugFlag? { sample: (rows as unknown as OrdersSummaryOrderRow[]).slice(0,5) }: undefined
    }
    return NextResponse.json({ success:true, data: payload })
  } catch(e){
    if(process.env.NODE_ENV!=='production') console.error('[ADMIN][ANALYTICS][SUMMARY]',e)
    return NextResponse.json({ success:false, error:'Server error' }, { status:500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
