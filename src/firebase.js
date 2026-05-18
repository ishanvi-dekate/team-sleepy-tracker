import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyBF2HQFMRn2q3OOtHMDabHMyBvDOL9s5S0",
  authDomain: "effecient-epp.firebaseapp.com",
  projectId: "effecient-epp",
  storageBucket: "effecient-epp.firebasestorage.app",
  messagingSenderId: "50733573022",
  appId: "1:50733573022:web:1c0a01b4e5ccf3273b6c8f"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Ensure auth state persists across refreshes via localStorage
setPersistence(auth, browserLocalPersistence).catch(console.error);
