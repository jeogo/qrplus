// Server-side FCM push sender for order events (Phase 2)
// Sends localized push notifications partitioned by role & language.

import admin from '@/lib/firebase/admin'

export interface BasicOrder {
  id: number
  table_id: number
  daily_number?: number
  status?: string
  account_id?: number
}

interface SendResultSummary {
  totalMessages: number
  totalTokens: number
  languageRoleBatches: Array<{ lang: 'ar'|'fr'; role: string; tokens: number; success: number; failure: number }>
}

const MAX_TOKENS_PER_BATCH = 500

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length <= size) return [arr]
  const out: T[][] = []
  for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i, i+size))
  return out
}

type PushKind = 'order.new'|'order.approved'|'order.ready'|'order.served'|'order.cancelled'

function buildTexts(kind: PushKind, lang: 'ar'|'fr', order: BasicOrder) {
  const num = order.daily_number ?? order.id
  const table = order.table_id
  switch (kind) {
    case 'order.new':
      return lang === 'ar'
        ? { title: `طلب جديد #${num}`, body: table ? `طاولة ${table}` : '' }
        : { title: `Nouvelle commande #${num}`, body: table ? `Table ${table}` : '' }
    case 'order.approved':
      return lang === 'ar'
        ? { title: `تم اعتماد الطلب #${num}`, body: table ? `طاولة ${table}` : '' }
        : { title: `Commande approuvée #${num}`, body: table ? `Table ${table}` : '' }
    case 'order.ready':
      return lang === 'ar'
        ? { title: `الطلب جاهز #${num}`, body: table ? `طاولة ${table}` : '' }
        : { title: `Commande prête #${num}`, body: table ? `Table ${table}` : '' }
    case 'order.served':
      return lang === 'ar'
        ? { title: `تم تقديم الطلب #${num}`, body: table ? `طاولة ${table}` : '' }
        : { title: `Commande servie #${num}`, body: table ? `Table ${table}` : '' }
    case 'order.cancelled':
      return lang === 'ar'
        ? { title: `تم إلغاء الطلب #${num}` , body: table ? `طاولة ${table}` : '' }
        : { title: `Commande annulée #${num}`, body: table ? `Table ${table}` : '' }
  }
}

async function fetchActiveTokens(roles: string[], order?: BasicOrder) {
  const db = admin.firestore()
  const snap = await db.collection('device_tokens').where('active','==',true).get()
  const records: Array<{ token:string; lang:'ar'|'fr'; role:string }> = []
  snap.forEach(d => {
    const raw = d.data() as unknown
    if (!raw || typeof raw !== 'object') return
    const token = (raw as Record<string, unknown>)['token']
    const role = (raw as Record<string, unknown>)['role']
    const langRaw = (raw as Record<string, unknown>)['lang']
    // If client role, optionally filter by account_id & table_id to this order only
    if (role === 'client' && order) {
      const acc = (raw as Record<string, unknown>)['account_id']
      const tbl = (raw as Record<string, unknown>)['table_id']
      if (typeof acc === 'number' && typeof order.account_id === 'number' && acc !== order.account_id) return
      if (typeof tbl === 'number' && typeof order.table_id === 'number' && tbl !== order.table_id) return
    }
    if (typeof token !== 'string' || !token) return
    if (typeof role !== 'string') return
    if (!roles.includes(role)) return
    const lang: 'ar'|'fr' = langRaw === 'ar' ? 'ar' : 'fr'
    records.push({ token, lang, role })
  })
  return records
}

async function sendBatches(kind: PushKind, order: BasicOrder, roles: string[]): Promise<SendResultSummary | null> {
  if (process.env.FCM_DISABLE === '1') return null
  let messaging: admin.messaging.Messaging | null = null
  try { messaging = admin.messaging() } catch { return null }
  const all = await fetchActiveTokens(roles, order)
  if (!all.length) return { totalMessages: 0, totalTokens: 0, languageRoleBatches: [] }
  const groups: Record<string, { lang:'ar'|'fr'; role:string; tokens:string[] }> = {}
  for (const rec of all) {
    const key = rec.lang + '|' + rec.role
    if (!groups[key]) groups[key] = { lang: rec.lang, role: rec.role, tokens: [] }
    groups[key].tokens.push(rec.token)
  }
  const summary: SendResultSummary = { totalMessages: 0, totalTokens: all.length, languageRoleBatches: [] }
  for (const g of Object.values(groups)) {
    let texts = buildTexts(kind, g.lang, order)
    // If future 'client' role tokens exist, hide raw order number for privacy.
    if (g.role === 'client') {
      const generic = ((): { title:string; body:string } => {
        const table = order.table_id
        switch (kind) {
          case 'order.new': return g.lang==='ar'? { title: 'تم استلام طلبك', body: table? `طاولة ${table}`:'' } : { title: 'Commande reçue', body: table? `Table ${table}`:'' }
          case 'order.approved': return g.lang==='ar'? { title: 'طلبك قيد التحضير', body: table? `طاولة ${table}`:'' } : { title: 'Votre commande est en préparation', body: table? `Table ${table}`:'' }
          case 'order.ready': return g.lang==='ar'? { title: 'طلبك جاهز', body: table? `طاولة ${table}`:'' } : { title: 'Votre commande est prête', body: table? `Table ${table}`:'' }
          case 'order.served': return g.lang==='ar'? { title: 'تم تقديم طلبك', body: '' } : { title: 'Votre commande a été servie', body: '' }
          case 'order.cancelled': return g.lang==='ar'? { title: 'تم إلغاء الطلب', body: '' } : { title: 'Commande annulée', body: '' }
        }
      })()
      texts = generic
    }
    const batches = chunk(g.tokens, MAX_TOKENS_PER_BATCH)
    for (const tokens of batches) {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title: texts.title, body: texts.body },
        webpush: {
          notification: {
            title: texts.title,
            body: texts.body,
            icon: '/icon-144x144.png',
            badge: '/icon-32x32.png',
            tag: `${kind}-${order.id}`,
            data: {
              type: kind,
              orderId: String(order.id),
              role: g.role,
              lang: g.lang,
            },
          },
          fcmOptions: {
            // When clicked open appropriate page; client redirected to its table
            link: g.role === 'kitchen' ? '/kitchen' : (g.role === 'waiter' ? '/waiter' : (g.role === 'client' ? (order.account_id ? `/menu/${order.account_id}/${order.table_id}` : `/menu/${order.table_id}`) : '/admin/orders'))
          }
        },
        data: {
          type: kind,
          orderId: String(order.id),
          dailyNumber: String(order.daily_number ?? ''),
          tableId: String(order.table_id ?? ''),
          role: g.role,
          lang: g.lang,
        },
      }
  console.log('[PUSH][SEND][BATCH]', kind, 'lang=', g.lang, 'role=', g.role, 'tokens=', tokens.length)
      try {
        const resp = await messaging.sendEachForMulticast(message)
        summary.totalMessages += 1
        summary.languageRoleBatches.push({ lang: g.lang, role: g.role, tokens: tokens.length, success: resp.successCount, failure: resp.failureCount })
        if (resp.failureCount) {
          const db = admin.firestore()
          await Promise.all(resp.responses.map((r,i)=>{
            if (!r.success) {
              const err = r.error
              const code = err?.code || ''
              if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
                return db.collection('device_tokens').doc(tokens[i]).set({ active:false, last_error_code: code, updated_at: new Date().toISOString() }, { merge:true })
              }
            }
            return Promise.resolve()
          }))
        }
      } catch (e) {
        summary.languageRoleBatches.push({ lang: g.lang, role: g.role, tokens: tokens.length, success: 0, failure: tokens.length })
        console.error('[PUSH][SEND][ERROR]', kind, g.lang, g.role, e)
      }
    }
  }
  return summary
}

export async function sendOrderNewPush(order: BasicOrder) {
  // New orders: alert kitchen & admin
  return sendBatches('order.new', order, ['kitchen','admin','client'])
}
export async function sendOrderApprovedPush(order: BasicOrder) {
  // Approved: kitchen can start preparing; admin may still want visibility
  return sendBatches('order.approved', order, ['kitchen','admin','client'])
}
export async function sendOrderReadyPush(order: BasicOrder) {
  // Ready: waiter & admin (admin for monitoring)
  return sendBatches('order.ready', order, ['waiter','admin','client'])
}
export async function sendOrderServedPush(order: BasicOrder) {
  // Served: primarily admin (optionally waiter, but waiter performed action already)
  return sendBatches('order.served', order, ['admin','client'])
}
export async function sendOrderCancelledPush(order: BasicOrder) {
  // Cancelled (archived/deleted): admin + kitchen + waiter (in case they had pending tasks)
  return sendBatches('order.cancelled', order, ['admin','kitchen','waiter','client'])
}
