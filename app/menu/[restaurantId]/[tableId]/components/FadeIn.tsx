"use client";
import { ReactNode } from 'react'

export function FadeIn({ delay=0, className='', children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className={`opacity-0 animate-fadeIn ${className}`}>
      {children}
    </div>
  )
}
