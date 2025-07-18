// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho",
  authDomain: "claire-database.firebaseapp.com",
  projectId: "claire-database",
  storageBucket: "claire-database.firebasestorage.app",
  messagingSenderId: "100635676468",
  appId: "1:100635676468:web:46fdecfad3133fef4b5f61",
  measurementId: "G-BYXJCRZ9EZ"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
// const analytics = getAnalytics(app);

export { app, auth, firestore };