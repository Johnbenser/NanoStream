import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';

const USERS_COLLECTION = 'users';

// --- AUTH STATE MANAGEMENT ---

export const subscribeToAuth = (
  callback: (user: FirebaseUser | null, role: string) => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Fetch Role from Firestore
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      
      // Listen to role changes in real-time
      const unsubRole = onSnapshot(userDocRef, (docSnap) => {
        // Default to EDITOR if no role doc exists yet
        const role = docSnap.exists() ? docSnap.data().role : 'EDITOR';
        callback(firebaseUser, role);
      });
      
      return unsubRole;
    } else {
      callback(null, '');
    }
  });
};

export const subscribeToUsers = (
  onData: (users: User[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
    onData(users);
  }, (error) => {
    console.error("Firebase Users Sync Error:", error);
    if (onError) onError(error);
  });
};

export const login = async (email: string, pass: string) => {
  await signInWithEmailAndPassword(auth, email, pass);
};

export const register = async (email: string, pass: string, username: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const uid = userCredential.user.uid;

  // Check if this is the FIRST user in the system
  const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), limit(1)));
  const isFirstUser = usersSnapshot.empty;

  // First user is ADMIN, others are EDITOR by default
  const role = isFirstUser ? 'ADMIN' : 'EDITOR';

  await setDoc(doc(db, USERS_COLLECTION, uid), {
    email,
    username, // Save the display username
    role,
    createdAt: new Date().toISOString()
  });

  return role;
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUserEmail = (): string | null => {
  return auth.currentUser?.email || null;
};

export const assignUserRole = async (uid: string, role: 'ADMIN' | 'EDITOR' | 'CSR') => {
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    role
  }, { merge: true });
};