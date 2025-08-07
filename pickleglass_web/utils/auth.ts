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
import { findOrCreateUser, createUserAndProfileSafely } from "./api"

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Create Firestore profile immediately without delay
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

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error("Error signing in with email:", error)
    throw error
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
      
      let displayName = 'User'
      if (firstName && lastName) {
        displayName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()} ${lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()}`
      } else if (firstName) {
        displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
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
    throw error
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback)
} 