// Simple Firebase test script
// Run this in the browser console to test Firebase connection

console.log('Testing Firebase connection...');

// Test Firebase Auth
import { auth } from './utils/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirestoreUserService } from './utils/firestore';

console.log('Firebase Auth instance:', auth);
console.log('FirestoreUserService available:', !!FirestoreUserService);

// Test function
window.testFirebaseRegistration = async (email, password) => {
  try {
    console.log('Testing user creation with:', email);
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Firebase Auth user created:', user.uid);
    
    // Create Firestore profile
    await FirestoreUserService.createUser(user.uid, {
      displayName: 'Test User',
      email: email
    });
    console.log('Firestore profile created successfully');
    
    // Clean up - delete the test user
    await user.delete();
    console.log('Test user deleted');
    
    return 'SUCCESS: Registration test passed!';
  } catch (error) {
    console.error('Registration test failed:', error);
    return `ERROR: ${error.message}`;
  }
};

console.log('Test function available: window.testFirebaseRegistration(email, password)'); 