// Debug utilities for Firebase registration issues
import { auth } from './firebase'
import { FirestoreUserService } from './firestore'
import { doc, getDoc } from 'firebase/firestore'
import { db as firestore } from './firebase'
import { handleFirebaseError } from './errorHandler'

export const debugFirebaseRegistration = async () => {
  console.log('🔍 Debugging Firebase Registration...')
  
  const user = auth.currentUser
  if (!user) {
    console.log('❌ No authenticated user found')
    return
  }
  
  console.log('✅ Firebase Auth user found:', {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  })
  
  // Check if Firestore document exists
  try {
    const userRef = doc(firestore, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      console.log('✅ Firestore document exists:', userSnap.data())
    } else {
      console.log('❌ Firestore document does not exist')
      
      // Try to create it manually
      console.log('🔄 Attempting to create Firestore document...')
      try {
        await FirestoreUserService.createUser(user.uid, {
          displayName: user.displayName || 'User',
          email: user.email || 'no-email@example.com'
        })
        console.log('✅ Firestore document created successfully')
      } catch (error) {
        console.error('❌ Failed to create Firestore document:', error)
      }
    }
  } catch (error) {
    console.error('❌ Error checking Firestore document:', error)
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).debugFirebaseRegistration = debugFirebaseRegistration
  console.log('🔧 Debug function available: window.debugFirebaseRegistration()')
} 