export interface Category {
  id: number
  account_id: number
  name: string
  description?: string
  active: boolean
  created_at: string
  updated_at: string
  image_url?: string
}

export interface Product {
  id: number
  account_id: number
  category_id: number
  name: string
  description?: string
  price: number
  image_url?: string
  available: boolean
  created_at: string
  updated_at: string
}
