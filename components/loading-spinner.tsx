"use client"

import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function LoadingSpinner({ size = "md", text, className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground animate-pulse">{text}</span>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg animate-scale-in">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-muted rounded-lg animate-shimmer"></div>
        <div className="flex-1">
          <div className="h-4 bg-muted rounded animate-shimmer mb-2"></div>
          <div className="h-3 bg-muted rounded animate-shimmer w-2/3"></div>
        </div>
      </div>
      <div className="h-10 bg-muted rounded animate-shimmer"></div>
    </div>
  )
}
