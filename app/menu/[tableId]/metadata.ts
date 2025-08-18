import type { Metadata } from 'next'

type Props = {
  params: { tableId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tableId = params.tableId
  
  return {
    title: `قائمة الطاولة ${tableId} | Table ${tableId} Menu`,
    description: `قائمة طعام المطعم للطاولة رقم ${tableId} - Restaurant Menu for Table ${tableId}`,
    robots: 'noindex, nofollow' // منع فهرسة صفحات القائمة الخاصة
  }
}
