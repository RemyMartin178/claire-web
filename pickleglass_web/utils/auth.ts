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

/**
 * Attend que l'utilisateur Firebase soit authentifié avant de continuer.
 * Timeout après 5 secondes si rien ne se passe.
 */
export const waitForAuth = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout: auth.currentUser is still null after 5s'));
    }, 5000);
    const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      }
    });
  });
};

export const createUserWithEmail = async (email: string, password: string, firstName?: string, lastName?: string) => {
  try {
    console.log('Auth: Starting user creation for email:', email)
    console.log('Auth: Firebase auth instance:', auth)
    console.log('Auth: Current auth state:', auth.currentUser)
    
    const result = await createUserWithEmailAndPassword(auth, email, password)
    const user = result.user
    console.log('Auth: Firebase user created successfully:', user.uid)
    console.log('Auth: User object:', { uid: user.uid, email: user.email, displayName: user.displayName })

    // Attendre 1 seconde pour la propagation des droits auth côté Google
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Attendre que l'utilisateur soit bien authentifié côté client
    const settledUser = await waitForAuth();
    console.log('Auth: Settled user after waitForAuth:', settledUser.uid)

    // Create display name from firstName and lastName if provided
    let displayName = 'User'
    if (firstName && lastName) {
      displayName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()} ${lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()}`
    } else if (firstName) {
      displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    }

    // Create user profile in Firestore
    console.log('Auth: Creating Firestore profile with:', { uid: settledUser.uid, display_name: displayName, email: settledUser.email || email })
    
    try {
      await findOrCreateUser({
        uid: settledUser.uid,
        display_name: displayName,
        email: settledUser.email || email
      })
      console.log('Auth: Firestore profile created successfully')
    } catch (firestoreError) {
      console.error('Auth: Error creating Firestore profile:', firestoreError)
      // Si Firestore échoue, on supprime l'utilisateur Firebase pour éviter un état incohérent
      try {
        await settledUser.delete()
        console.log('Auth: Deleted Firebase user due to Firestore error')
      } catch (deleteError) {
        console.error('Auth: Error deleting Firebase user:', deleteError)
      }
      throw new Error('Erreur lors de la création du profil utilisateur. Veuillez réessayer.')
    }

    return settledUser
  } catch (error) {
    console.error("Auth: Error creating user with email:", error)
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