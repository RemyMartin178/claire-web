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
    
    // Vérifier immédiatement l'état actuel de Firebase
    const currentUser = auth.currentUser
    if (currentUser && wasManuallyLoggedOut !== 'true') {
      // Si on a déjà un utilisateur connecté, l'utiliser immédiatement
      handleUserAuthentication(currentUser)
    } else {
      // Si pas d'utilisateur, marquer comme non authentifié immédiatement
      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
    }
    
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
    try {
      // Créer un profil de fallback immédiatement pour éviter les flashs
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        display_name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || 'no-email@example.com'
      }
      
      // Définir l'utilisateur immédiatement
      setUser(fallbackProfile)
      setIsAuthenticated(true)
      setLoading(false)
      
      // Ensuite, essayer de récupérer le profil complet en arrière-plan
      try {
        const userProfile = await getUserProfile()
        if (userProfile) {
          setUser(userProfile)
        }
      } catch (error) {
        console.warn('Failed to fetch user profile, using fallback:', error)
      }
    } catch (error: any) {
      console.error('Auth failed:', error)
      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
} 
