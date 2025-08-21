import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0
  }).format(price)
}
// Localized currency formatter with language-aware locale selection and safe fallback
export function formatCurrencyLocalized(value: number, currency: string, language: 'ar' | 'fr' | 'en', opts: { minimumFractionDigits?: number } = {}): string {
  const minimumFractionDigits = opts.minimumFractionDigits ?? 2
  const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits }).format(value)
  } catch {
    // Fallback basic formatting
    const symbol = currency === 'DZD' ? (language === 'ar' ? 'دج' : 'DZD') : currency
    return `${value.toFixed(minimumFractionDigits)} ${symbol}`
  }
}
 export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): boolean {
  // At least 6 characters
  return password.length >= 6
}

export function generateQRCodeUrl(tableId: string, accountId: string): string {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com'
    : 'http://localhost:3000'
  // Updated pattern: /menu/{accountId}/{tableId}
  return `${baseUrl}/menu/${accountId}/${tableId}`
}

export function generateTableNumber(): number {
  return Math.floor(Math.random() * 1000) + 1
}

export const ORDER_STATUSES = {
  pending: 'pending',
  approved: 'approved', 
  preparing: 'preparing',
  ready: 'ready',
  served: 'served'
} as const

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES]

export function getStatusColor(status: OrderStatus): string {
  const colors = {
    pending: 'bg-yellow-500',
    approved: 'bg-blue-500',
    preparing: 'bg-orange-500', 
    ready: 'bg-green-500',
    served: 'bg-gray-500'
  }
  return colors[status] || 'bg-gray-500'
}

export function uploadImageToCloudinary(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'restaurant-uploads')
    formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '')

    fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.secure_url) {
        resolve(data.secure_url)
      } else {
        reject(new Error('Upload failed'))
      }
    })
    .catch(reject)
  })
}
