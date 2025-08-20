"use client"

export function UsersSkeletonGrid(){
  return (
    <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({length:8}).map((_,i)=>(
        <div key={i} className="rounded-xl border p-4 animate-pulse space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 bg-muted rounded w-32" />
              <div className="h-2.5 bg-muted rounded w-40" />
            </div>
            <div className="h-6 w-14 bg-muted rounded" />
          </div>
          <div className="space-y-1 pt-1">
            <div className="h-2 bg-muted rounded w-2/3" />
            <div className="h-2 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded w-4/5" />
            <div className="h-2 bg-muted rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
