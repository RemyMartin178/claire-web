"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signInWithCustomToken, type User } from "firebase/auth"
import { auth } from "../utils/firebase"
import { getUserProfile, type UserProfile } from "../utils/api"

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__claireElectronSignIn = async (customToken: string) => {
        await signInWithCustomToken(auth, customToken)
      }
    }
    return () => {
      if (typeof window !== 'undefined') delete (window as any).__claireElectronSignIn
    }
  }, [])

  useEffect(() => {
    const wasManuallyLoggedOut = sessionStorage.getItem('manuallyLoggedOut')

    const initTimer = setTimeout(() => {
      const currentUser = auth.currentUser
      if (currentUser && wasManuallyLoggedOut !== 'true') {
        handleUserAuthentication(currentUser)
      } else if (wasManuallyLoggedOut === 'true') {
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
      }
    }, 100)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (wasManuallyLoggedOut === 'true') {
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      if (firebaseUser) {
        await handleUserAuthentication(firebaseUser)
      } else {
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(initTimer)
      unsubscribe()
    }
  }, [])

  const handleUserAuthentication = async (firebaseUser: User) => {
    try {
      // Créer un profil de fallback immédiatement pour éviter les flashs
      // Utiliser l'email comme nom temporaire au lieu de 'User'
      const email = firebaseUser.email || 'no-email@example.com'
      const displayName = firebaseUser.displayName || email.split('@')[0] || 'Utilisateur'
      
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        display_name: displayName,
        email: email
      }
      
      // Définir l'utilisateur immédiatement
      setUser(fallbackProfile)
      setIsAuthenticated(true)
      // On garde loading à true jusqu'à la fin de la récupération du profil Firestore
      
      // Ensuite, essayer de récupérer le profil complet en arrière-plan
      try {
        const userProfile = await getUserProfile()
        if (userProfile) {
          setUser(userProfile)
          const adminFlag = userProfile.isAdmin === true
          setIsAdmin(adminFlag)
        }
      } catch {
        // fallback profile already set
      } finally {
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Auth failed:', error)
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
} 
