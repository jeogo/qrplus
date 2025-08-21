import { describe, it, expect } from 'vitest'
import { adminMenuTexts } from '@/lib/i18n/admin-menu'
import { adminDashboardTexts } from '@/lib/i18n/admin-dashboard'
import { waiterTexts } from '@/lib/i18n/waiter'
import { getKitchenTexts } from '@/lib/i18n/kitchen'

const groups = [adminMenuTexts, adminDashboardTexts, waiterTexts]

describe('i18n completeness', () => {
  it('all groups have same keys across languages', () => {
    for (const g of groups) {
      const langs = Object.keys(g) as Array<'ar'|'fr'|'en'>
      const base = new Set(Object.keys(g[langs[0]]))
      for (const l of langs.slice(1)) {
        const keys = Object.keys(g[l])
        for (const k of base) {
          expect(keys).toContain(k)
        }
      }
    }
  })

  it('kitchen texts basic keys exist for each language', () => {
    const needed = ['title','loading','noOrders','refresh','markReady','table','items','pending','approved','ready','served']
    ;(['ar','fr','en'] as const).forEach(l => {
      const t = getKitchenTexts(l)
      needed.forEach(k => expect(t).toHaveProperty(k))
    })
  })
})
