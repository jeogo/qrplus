"use client"
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function KitchenLoadingSkeleton(){
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({length:6}).map((_,i)=>(
        <div key={i} className="rounded-xl border border-slate-200 p-6 bg-white space-y-4">
          <div className="flex gap-3 items-center">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            {Array.from({length:3}).map((__,j)=>(<Skeleton key={j} className="h-10 w-full" />))}
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
