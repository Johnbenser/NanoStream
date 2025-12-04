import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyApcwC_RLvjJBz7keAMK7I5PIzR1RNnBhY",
  authDomain: "nano-stream-d1d91.firebaseapp.com",
  projectId: "nano-stream-d1d91",
  storageBucket: "nano-stream-d1d91.firebasestorage.app",
  messagingSenderId: "806597131348",
  appId: "1:806597131348:web:18d06b7beb98ad7db041c1",
  measurementId: "G-S75ELV123C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);