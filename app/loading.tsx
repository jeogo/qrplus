"use client"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 animate-fade-in-up">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground animate-pulse">
            جاري التحميل...
          </h2>
          <p className="text-sm text-muted-foreground">
            Loading QRPlus System...
          </p>
        </div>
      </div>
    </div>
  )
}
