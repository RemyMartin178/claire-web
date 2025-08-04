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
    
    // Vérifier si l'utilisateur a été déconnecté manuellement
    const wasManuallyLoggedOut = sessionStorage.getItem('manuallyLoggedOut')
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: Auth state changed', { 
        hasUser: !!firebaseUser, 
        email: firebaseUser?.email,
        wasManuallyLoggedOut
      })
      
      // Si l'utilisateur a été déconnecté manuellement, ne pas se reconnecter automatiquement
      if (wasManuallyLoggedOut === 'true') {
        console.log('AuthContext: User was manually logged out, not auto-reconnecting')
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      
      if (firebaseUser) {
        try {
          console.log('AuthContext: Fetching user profile for:', firebaseUser.uid)
          const userProfile = await getUserProfile()
          if (!userProfile) {
            console.warn('AuthContext: Firestore profile not found, user probably just registered.');
            setUser(null)
            setIsAuthenticated(false)
          } else {
            console.log('AuthContext: User profile fetched:', userProfile)
            setUser(userProfile)
            setIsAuthenticated(true)
          }
        } catch (error) {
          console.error('AuthContext: Error fetching user profile:', error)
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        console.log('AuthContext: No user, clearing state')
        setUser(null)
        setIsAuthenticated(false)
      }
      setLoading(false)
    })

    return () => {
      console.log('AuthContext: Cleaning up auth listener')
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
} 