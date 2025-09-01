import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from "firebase/auth"
import { auth } from "./firebase"
import { apiCall } from './api'
import { getApiBase } from './http'
import { findOrCreateUser, createUserAndProfileSafely } from "./api"
import { FirebaseErrorHandler } from "./errorHandler"

const googleProvider = new GoogleAuthProvider()
// Force l'affichage de l'écran de consentement + sélection de compte
googleProvider.setCustomParameters({ prompt: 'consent select_account' })

export const signInWithGoogle = async (rememberMe: boolean = true) => {
  try {
    // Nettoyer le flag de déconnexion manuelle
    sessionStorage.removeItem('manuallyLoggedOut')
    
    // Définir la persistance selon le choix de l'utilisateur
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence
    await setPersistence(auth, persistence)

    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    await findOrCreateUser({
      uid: user.uid,
      display_name: user.displayName || 'User',
      email: user.email || 'no-email@example.com'
    })

    return user
  } catch (error: any) {
    console.error("Error signing in with Google (popup):", error)

    // Ne plus fallback en redirect pour éviter remount App Router → erreurs #300/#310

    throw FirebaseErrorHandler.wrapError(error)
  }
}

export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      const user = result.user
      await findOrCreateUser({
        uid: user.uid,
        display_name: user.displayName || 'User',
        email: user.email || 'no-email@example.com'
      })
      // In mobile flow, associate tokens with pending_session
      const idToken = await user.getIdToken(true)
      const refreshToken = user.refreshToken
      const params = new URLSearchParams(window.location.search)
      if (params.get('flow') === 'mobile' && params.get('session_id')) {
        const API = getApiBase();
        const resp = await fetch(`${API}/api/auth/associate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            session_id: params.get('session_id'),
            id_token: idToken,
            refresh_token: refreshToken,
          }),
        })
        if (resp.ok) {
          const data = await resp.json().catch(() => null)
          if (data?.state) {
            sessionStorage.setItem('mobile_state', data.state)
          }
        }
      }
      return user
    }
    return null
  } catch (error: any) {
    console.error('Error handling Google redirect result:', error)
    throw FirebaseErrorHandler.wrapError(error)
  }
}

export const signInWithEmail = async (email: string, password: string, rememberMe: boolean = true) => {
  try {
    // Nettoyer le flag de déconnexion manuelle
    sessionStorage.removeItem('manuallyLoggedOut')
    
    // Définir la persistance selon le choix de l'utilisateur
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence
    await setPersistence(auth, persistence)
    
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error("Error signing in with email:", error)
    throw FirebaseErrorHandler.wrapError(error)
  }
}

export const createUserWithEmail = async (email: string, password: string, firstName?: string, lastName?: string) => {
  const MAX_RETRIES = 2; // Reduced from 3
  const RETRY_DELAY = 500; // Reduced from 1000
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('Auth: Starting user creation for email:', email)
      console.log('Auth: Firebase auth instance:', auth)
      console.log('Auth: Current auth state:', auth.currentUser)
      console.log('Auth: firstName:', firstName, 'lastName:', lastName)
      
      let displayName = 'User'
      if (firstName && lastName && firstName.trim() && lastName.trim()) {
        displayName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()} ${lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()}`
        console.log('Auth: Using full name:', displayName)
      } else if (firstName && firstName.trim()) {
        displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
        console.log('Auth: Using first name only:', displayName)
      } else if (lastName && lastName.trim()) {
        displayName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()
        console.log('Auth: Using last name only:', displayName)
      } else {
        console.log('Auth: Using default name:', displayName)
      }

      const user = await createUserAndProfileSafely(email, password, '', {
        displayName,
        email
      });

      console.log('Auth: Firestore profile created successfully')
      return user
    } catch (error: any) {
      console.error(`createUserWithEmail: Attempt ${attempt} failed:`, error)
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Cette adresse email est déjà utilisée')
      }
      
      if (error.code === 'auth/weak-password') {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères')
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('Adresse email invalide')
      }
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Échec de la création du compte après ${MAX_RETRIES} tentatives. Veuillez réessayer.`)
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
    }
  }
}

export const sendPasswordResetEmail = async (email: string) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error("Error sending password reset email:", error)
    throw FirebaseErrorHandler.wrapError(error)
  }
}

export const signOut = async () => {
  try {
    // Marquer que l'utilisateur s'est déconnecté manuellement
    sessionStorage.setItem('manuallyLoggedOut', 'true')
    
    // Nettoyer le sessionStorage pour forcer une nouvelle vérification d'auth
    sessionStorage.removeItem('authChecked')
    sessionStorage.removeItem('authUserId')
    
    await firebaseSignOut(auth)
    
    // Rediriger vers la page de connexion au lieu de la landing page
    window.location.href = '/login'
  } catch (error) {
    console.error("Error signing out:", error)
    throw FirebaseErrorHandler.wrapError(error)
  }
}

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback)
} 