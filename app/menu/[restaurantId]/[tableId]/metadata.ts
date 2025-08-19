import type { Metadata } from 'next'

type Props = { params: { restaurantId: string; tableId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { restaurantId, tableId } = params
  return {
    title: `Menu R${restaurantId} T${tableId} | قائمة المطعم ${restaurantId} الطاولة ${tableId}`,
    description: `Restaurant ${restaurantId} - Table ${tableId} bilingual dynamic menu`,
    robots: 'noindex, nofollow'
  }
}

export default function MetaStub() { return null }
