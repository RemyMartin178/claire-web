"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "../utils/firebase"
import { getUserProfile, type UserProfile } from "../utils/api"

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log('Fetching user profile for:', firebaseUser.uid)
          const userProfile = await getUserProfile()
          console.log('User profile fetched:', userProfile)
          setUser(userProfile)
        } catch (error) {
          console.error('Error fetching user profile:', error)
          // Fallback to Firebase user data
          const fallbackUser = {
            uid: firebaseUser.uid,
            display_name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || 'no-email@example.com'
          }
          console.log('Using fallback user data:', fallbackUser)
          setUser(fallbackUser)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
} 