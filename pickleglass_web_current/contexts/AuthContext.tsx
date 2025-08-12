"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "../utils/firebase"
import { getUserProfile, type UserProfile } from "../utils/api"

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener')
    
    const wasManuallyLoggedOut = sessionStorage.getItem('manuallyLoggedOut')
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: Auth state changed', { 
        hasUser: !!firebaseUser, 
        email: firebaseUser?.email,
        wasManuallyLoggedOut
      })
      
      if (wasManuallyLoggedOut === 'true') {
        console.log('AuthContext: User was manually logged out, not auto-reconnecting')
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      
      if (firebaseUser) {
        await handleUserAuthentication(firebaseUser)
      } else {
        console.log('AuthContext: No user, clearing state')
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
      }
    })

    return () => {
      console.log('AuthContext: Cleaning up auth listener')
      unsubscribe()
    }
  }, [])

  const handleUserAuthentication = async (firebaseUser: User) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 500;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const userProfile = await getUserProfile()
        
        if (userProfile) {
          setUser(userProfile)
          setIsAuthenticated(true)
          setLoading(false)
          return
        }
        
        if (attempt === MAX_RETRIES) {
          console.warn('User profile not found, creating fallback profile')
          const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            display_name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || 'no-email@example.com'
          }
          setUser(fallbackProfile)
          setIsAuthenticated(true)
          setLoading(false)
          return
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
      } catch (error: any) {
        console.error(`Auth attempt ${attempt} failed:`, error)
        
        if (attempt === MAX_RETRIES) {
          console.error('All auth attempts failed')
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
          return
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
} 