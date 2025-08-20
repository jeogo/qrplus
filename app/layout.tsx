import type React from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/lib/firebase/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { NotificationsHost } from "@/components/notifications-host"
import { ServiceWorkerRegister } from "@/components/sw-register"
import { PushBootstrap } from "@/components/push-bootstrap"
import { PWAInstallBanner } from "@/components/pwa-install-banner"
import "./globals.css"


export const metadata: Metadata = {
  title: {
    default: "QRPlus Restaurant System",
    template: "%s | QRPlus"
  },
  description:
    "Restaurant menu management system with bilingual support - نظام إدارة قائمة المطعم مع الدعم ثنائي اللغة",
  generator: "Next.js",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QRPlus Restaurant",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
  <html lang="en" className="antialiased">
      <head>
        <meta name="application-name" content="Restaurant Admin" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Restaurant Admin" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#15803d" />
        <meta name="msapplication-tap-highlight" content="no" />

        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          <NotificationsHost>
              <ServiceWorkerRegister />
            <PushBootstrap />
            <PWAInstallBanner />
            {children}
            <Toaster richColors position="top-right" />
          </NotificationsHost>
        </AuthProvider>
      </body>
    </html>
  )
}
