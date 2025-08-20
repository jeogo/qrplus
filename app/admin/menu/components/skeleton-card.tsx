"use client"
import { memo } from 'react'

interface SkeletonCardProps { variant?: 'category' | 'product' }

export const SkeletonCard = memo(function SkeletonCard({ variant='category' }: SkeletonCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm animate-pulse">
      <div className="p-4 flex gap-3">
        <div className="h-16 w-16 rounded-xl bg-slate-200/60" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 w-1/2 bg-slate-200/70 rounded" />
          <div className="h-3 w-2/3 bg-slate-200/60 rounded" />
          <div className="h-3 w-1/3 bg-slate-200/50 rounded" />
        </div>
      </div>
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="h-5 w-20 bg-slate-200/60 rounded-full" />
        {variant==='product' && <div className="h-4 w-12 bg-slate-200/50 rounded" />}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50" />
    </div>
  )
})
