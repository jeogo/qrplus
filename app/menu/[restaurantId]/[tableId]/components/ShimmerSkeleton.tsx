"use client";
import React from 'react'

export function ShimmerSkeleton({ className='' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-muted/40 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  )
}
