"use client"
export function OrderCardSkeleton({ mode='cards' }: { mode?: 'cards'|'list'|'compact' }) {
  const base = mode==='cards'
  if (base) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm p-5 animate-pulse space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-16 rounded bg-slate-200" />
            <div className="h-5 w-20 rounded bg-slate-200" />
            <div className="h-4 w-14 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-2">
          {Array.from({length:3}).map((_,i)=>(<div key={i} className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-slate-200" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
          </div>))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-5 w-24 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-24 rounded bg-slate-200" />
          <div className="h-8 w-20 rounded bg-slate-100" />
        </div>
      </div>
    )
  }
  // list / compact skeleton
  return (
    <div className="rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm p-3 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-16 rounded bg-slate-200" />
          <div className="h-5 w-20 rounded bg-slate-200" />
          <div className="h-4 w-14 rounded bg-slate-100" />
        </div>
        <div className="h-6 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-4 w-40 bg-slate-100 rounded" />
        <div className="h-4 w-12 bg-slate-100 rounded" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-8 w-24 rounded bg-slate-200" />
        <div className="h-8 w-20 rounded bg-slate-100" />
      </div>
    </div>
  )
}

export function OrdersSkeletonGrid({ count=6, mode='cards' }: { count?: number; mode?: 'cards'|'list'|'compact' }) {
  if (mode==='cards') {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({length:count}).map((_,i)=>(<OrderCardSkeleton key={i} mode="cards" />))}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {Array.from({length:count}).map((_,i)=>(<OrderCardSkeleton key={i} mode={mode} />))}
    </div>
  )
}
