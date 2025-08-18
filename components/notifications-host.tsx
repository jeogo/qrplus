"use client"
import React from 'react'
import { useOrderNotifications } from '@/hooks/use-order-notifications'

export function NotificationsHost({ children }: { children: React.ReactNode }) {
  useOrderNotifications()
  return <>{children}</>
}
