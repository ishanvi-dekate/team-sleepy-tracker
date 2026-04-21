import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYYgG6Dt65VRBynVrVZ9VCI_4p8IBiNHQ",
  authDomain: "ee-epp.firebaseapp.com",
  projectId: "ee-epp",
  storageBucket: "ee-epp.firebasestorage.app",
  messagingSenderId: "579402532613",
  appId: "1:579402532613:web:f02b9d1bab97d7ad3b596c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();


