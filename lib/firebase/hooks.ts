'use client'

import { useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { auth } from './config'
import { 
  Restaurant, 
  Table, 
  Category, 
  Product, 
  Order, 
  restaurantService, 
  tableService, 
  categoryService, 
  productService, 
  orderService 
} from './database'
import { OrderStatus } from '../utils'

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return { user, loading }
}

export function useRestaurant(accountId?: string) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    const fetchRestaurant = async () => {
      try {
        setLoading(true)
        const data = await restaurantService.getRestaurant(accountId)
        setRestaurant(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurant()
  }, [accountId])

  return { restaurant, loading, error, refetch: () => setLoading(true) }
}

export function useTables(accountId?: string) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    const fetchTables = async () => {
      try {
        setLoading(true)
        const data = await tableService.getTables(accountId)
        setTables(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [accountId])

  const addTable = async (tableData: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await tableService.addTable(tableData)
      const newTable = { ...tableData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      setTables(prev => [...prev, newTable])
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const updateTable = async (id: string, tableData: Partial<Table>) => {
    try {
      await tableService.updateTable(id, tableData)
      setTables(prev => prev.map(table => 
        table.id === id ? { ...table, ...tableData, updatedAt: new Date().toISOString() } : table
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const deleteTable = async (id: string) => {
    try {
      await tableService.deleteTable(id)
      setTables(prev => prev.filter(table => table.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  return { 
    tables, 
    loading, 
    error, 
    addTable, 
    updateTable, 
    deleteTable,
    refetch: () => setLoading(true) 
  }
}

export function useCategories(accountId?: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    const fetchCategories = async () => {
      try {
        setLoading(true)
        const data = await categoryService.getCategories(accountId)
        setCategories(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [accountId])

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await categoryService.addCategory(categoryData)
      const newCategory = { ...categoryData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      setCategories(prev => [...prev, newCategory])
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    try {
      await categoryService.updateCategory(id, categoryData)
      setCategories(prev => prev.map(category => 
        category.id === id ? { ...category, ...categoryData, updatedAt: new Date().toISOString() } : category
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      await categoryService.deleteCategory(id)
      setCategories(prev => prev.filter(category => category.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  return { 
    categories, 
    loading, 
    error, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    refetch: () => setLoading(true) 
  }
}

export function useProducts(accountId?: string, categoryId?: string) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await productService.getProducts(accountId, categoryId)
        setProducts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [accountId, categoryId])

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await productService.addProduct(productData)
      const newProduct = { ...productData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      setProducts(prev => [...prev, newProduct])
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      await productService.updateProduct(id, productData)
      setProducts(prev => prev.map(product => 
        product.id === id ? { ...product, ...productData, updatedAt: new Date().toISOString() } : product
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id)
      setProducts(prev => prev.filter(product => product.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  return { 
    products, 
    loading, 
    error, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    refetch: () => setLoading(true) 
  }
}

export function useOrders(accountId?: string, status?: OrderStatus) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    const unsubscribe = orderService.subscribeToOrders(
      accountId,
      (orders) => {
        setOrders(orders)
        setLoading(false)
      },
      status
    )

    return unsubscribe
  }, [accountId, status])

  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await orderService.addOrder(orderData)
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(id, status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  const deleteOrder = async (id: string) => {
    try {
      await orderService.deleteOrder(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  return { 
    orders, 
    loading, 
    error, 
    addOrder, 
    updateOrderStatus, 
    deleteOrder,
    refetch: () => setLoading(true) 
  }
}
