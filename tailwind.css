// ============================================
// UniMart - Firebase Configuration
// ============================================
// IMPORTANT: Replace the values below with YOUR OWN Firebase project credentials.
// Get these from: Firebase Console → Project Settings → General → Your Apps → SDK setup

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDiE-eVLdotj3e6wM78fy8_T0GYSgCUp20",
  authDomain: "livemart-5eace.firebaseapp.com",
  projectId: "livemart-5eace",
  storageBucket: "livemart-5eace.firebasestorage.app",
  messagingSenderId: "455931386536",
  appId: "1:455931386536:web:1544561cc2e04c011e009d",
  measurementId: "G-WF84DGW19W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services used across the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Security: don't keep people logged in across browser sessions.
// Closing the tab/browser signs them out — the next visit always
// starts fresh at the homepage, requiring login again. This matters
// most for shared/public devices accessing seller, agent, or admin
// accounts (which have access to sensitive data and actions).
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

export default app;
