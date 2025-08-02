import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from "firebase/auth"
import { auth } from "./firebase"
import { findOrCreateUser } from "./api"

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Create user profile in Firestore
    await findOrCreateUser({
      uid: user.uid,
      display_name: user.displayName || 'User',
      email: user.email || 'no-email@example.com'
    })

    return user
  } catch (error) {
    console.error("Error signing in with Google:", error)
    throw error
  }
}

export const createUserWithEmail = async (email: string, password: string, firstName?: string, lastName?: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    const user = result.user

    // Create display name from firstName and lastName if provided
    let displayName = 'User'
    if (firstName && lastName) {
      displayName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()} ${lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()}`
    } else if (firstName) {
      displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    }

    // Create user profile in Firestore
    console.log('Creating user profile with:', { uid: user.uid, display_name: displayName, email: user.email || email })
    await findOrCreateUser({
      uid: user.uid,
      display_name: displayName,
      email: user.email || email
    })
    console.log('User profile created successfully')

    return user
  } catch (error) {
    console.error("Error creating user with email:", error)
    throw error
  }
}

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error("Error signing in with email:", error)
    throw error
  }
}

export const signOut = async () => {
  try {
    console.log('Auth: Starting sign out process')
    
    // Marquer que l'utilisateur a été déconnecté manuellement
    sessionStorage.setItem('manuallyLoggedOut', 'true')
    
    // Déconnecter de Firebase
    await firebaseSignOut(auth)
    
    // Nettoyer le localStorage complètement
    localStorage.clear()
    
    // Nettoyer les cookies de session
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    })
    
    // Nettoyer sessionStorage aussi (sauf le marqueur de déconnexion manuelle)
    const manuallyLoggedOut = sessionStorage.getItem('manuallyLoggedOut')
    sessionStorage.clear()
    if (manuallyLoggedOut) {
      sessionStorage.setItem('manuallyLoggedOut', manuallyLoggedOut)
    }
    
    // Forcer la déconnexion de Firebase en supprimant les données persistantes
    if (typeof window !== 'undefined') {
      // Supprimer les données Firebase du localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firebase:') || key.includes('auth')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    console.log('Auth: Sign out completed successfully')
    
    // Rediriger vers la landing page
    window.location.replace('https://clairia.app')
  } catch (error) {
    console.error("Error signing out:", error)
    // En cas d'erreur, rediriger quand même
    window.location.replace('https://clairia.app')
  }
}

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback)
}

export const getCurrentUser = () => {
  return auth.currentUser
}

export const sendPasswordResetEmail = async (email: string) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error("Error sending password reset email:", error)
    throw error
  }
} 