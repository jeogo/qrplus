"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Home, ArrowLeft, Search, RefreshCw } from "lucide-react"

export default function NotFound() {
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.href = "/"
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2">
        <CardContent className="p-8 text-center space-y-6">
          {/* Animated 404 */}
          <div className="relative">
            <h1 className="text-8xl font-bold text-primary/20 select-none animate-pulse">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-16 h-16 text-muted-foreground animate-bounce" />
            </div>
          </div>

          {/* Bilingual Messages */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              الصفحة غير موجودة
            </h2>
            <h3 className="text-xl font-semibold text-muted-foreground">
              Page Not Found
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
              <br />
              Sorry, the page you are looking for is not available or has been moved.
            </p>
          </div>

          {/* Countdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">
                إعادة توجيه تلقائي خلال {countdown} ثانية
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Auto redirect in {countdown} seconds
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/" className="w-full">
              <Button className="w-full gap-2" size="lg">
                <Home className="w-4 h-4" />
                العودة للرئيسية / Go Home
              </Button>
            </Link>
            
            <Link href="/auth" className="w-full">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                تسجيل الدخول / Login
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              QRPlus Restaurant System
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
