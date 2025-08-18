import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { db } from './config'
import { OrderStatus } from '../utils'

// Types
export interface Restaurant {
  id: string
  name: string
  accountId: string
  settings: {
    language: 'ar' | 'fr'
    currency: string
    timezone: string
  }
  createdAt: string
  updatedAt: string
}

export interface Table {
  id: string
  accountId: string
  tableNumber: number
  qrCodeUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  accountId: string
  nameAr: string
  nameFr: string
  descriptionAr?: string
  descriptionFr?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  accountId: string
  categoryId: string
  nameAr: string
  nameFr: string
  descriptionAr?: string
  descriptionFr?: string
  price: number
  image?: string
  isAvailable: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  notes?: string
  product?: Product
}

export interface Order {
  id: string
  accountId: string
  tableId: string
  status: OrderStatus
  items: OrderItem[]
  totalAmount: number
  customerNotes?: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'waiter' | 'kitchen'
  accountId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Restaurant Operations
export const restaurantService = {
  async getRestaurant(accountId: string): Promise<Restaurant | null> {
    const docRef = doc(db, 'restaurants', accountId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Restaurant : null
  },

  async createRestaurant(data: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'restaurants'), {
      ...data,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<void> {
    const docRef = doc(db, 'restaurants', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  }
}

// Table Operations  
export const tableService = {
  async getTables(accountId: string): Promise<Table[]> {
    const q = query(
      collection(db, 'tables'),
      where('accountId', '==', accountId),
      orderBy('tableNumber', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table))
  },

  async addTable(data: Omit<Table, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'tables'), {
      ...data,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async updateTable(id: string, data: Partial<Table>): Promise<void> {
    const docRef = doc(db, 'tables', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  },

  async deleteTable(id: string): Promise<void> {
    const docRef = doc(db, 'tables', id)
    await deleteDoc(docRef)
  }
}

// Category Operations
export const categoryService = {
  async getCategories(accountId: string): Promise<Category[]> {
    const q = query(
      collection(db, 'categories'),
      where('accountId', '==', accountId),
      where('isActive', '==', true),
      orderBy('sortOrder', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))
  },

  async addCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'categories'), {
      ...data,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    const docRef = doc(db, 'categories', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  },

  async deleteCategory(id: string): Promise<void> {
    const docRef = doc(db, 'categories', id)
    await deleteDoc(docRef)
  }
}

// Product Operations
export const productService = {
  async getProducts(accountId: string, categoryId?: string): Promise<Product[]> {
    let q = query(
      collection(db, 'products'),
      where('accountId', '==', accountId)
    )
    
    if (categoryId) {
      q = query(q, where('categoryId', '==', categoryId))
    }
    
    q = query(q, orderBy('sortOrder', 'asc'))
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
  },

  async addProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'products'), {
      ...data,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const docRef = doc(db, 'products', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  },

  async deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, 'products', id)
    await deleteDoc(docRef)
  }
}

// Order Operations
export const orderService = {
  async getOrders(accountId: string, status?: OrderStatus): Promise<Order[]> {
    let q = query(
      collection(db, 'orders'),
      where('accountId', '==', accountId)
    )
    
    if (status) {
      q = query(q, where('status', '==', status))
    }
    
    q = query(q, orderBy('createdAt', 'desc'))
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
  },

  async addOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'orders'), {
      ...data,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
    const docRef = doc(db, 'orders', id)
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    })
  },

  async deleteOrder(id: string): Promise<void> {
    const docRef = doc(db, 'orders', id)
    await deleteDoc(docRef)
  },

  // Real-time order subscription
  subscribeToOrders(accountId: string, callback: (orders: Order[]) => void, status?: OrderStatus) {
    let q = query(
      collection(db, 'orders'),
      where('accountId', '==', accountId)
    )
    
    if (status) {
      q = query(q, where('status', '==', status))
    }
    
    q = query(q, orderBy('createdAt', 'desc'))
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order))
      callback(orders)
    })
  }
}

// User Operations
export const userService = {
  async getUsers(accountId: string): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('accountId', '==', accountId),
      where('isActive', '==', true)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
  },

  async addUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'users'), {
      ...data,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    const docRef = doc(db, 'users', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  },

  async deleteUser(id: string): Promise<void> {
    const docRef = doc(db, 'users', id)
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: new Date().toISOString()
    })
  }
}
