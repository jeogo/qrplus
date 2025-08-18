'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './config'

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<UserData>) => Promise<void>
  logout: () => Promise<void>
}

interface UserData {
  id: string
  email: string
  name: string
  role: 'admin' | 'waiter' | 'kitchen'
  accountId: string
  createdAt: string
  updatedAt: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData)
        }
      } else {
        setUserData(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, newUserData: Partial<UserData>) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update user profile
    await updateProfile(user, {
      displayName: newUserData.name
    })

    // Save user data to Firestore
    const userData: UserData = {
      id: user.uid,
      email: user.email!,
      name: newUserData.name || '',
      role: newUserData.role || 'admin',
      accountId: newUserData.accountId || user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await setDoc(doc(db, 'users', user.uid), userData)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
