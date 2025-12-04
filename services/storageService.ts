import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Creator, CreatorFormData, LogEntry } from '../types';

const CREATORS_COLLECTION = 'creators';
const LOGS_COLLECTION = 'logs';

// --- REAL-TIME LISTENERS ---

export const subscribeToCreators = (
  onData: (creators: Creator[]) => void, 
  onError?: (error: any) => void
) => {
  const q = query(collection(db, CREATORS_COLLECTION), orderBy('lastUpdated', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const creators = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Creator[];
    onData(creators);
  }, (error) => {
    console.error("Firebase Creators Sync Error:", error);
    if (onError) onError(error);
  });
};

export const subscribeToLogs = (
  onData: (logs: LogEntry[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LogEntry[];
    onData(logs);
  }, (error) => {
    console.error("Firebase Logs Sync Error:", error);
    if (onError) onError(error);
  });
};

// --- ACTIONS ---

export const addLog = async (action: LogEntry['action'], target: string): Promise<void> => {
  try {
    const user = auth.currentUser ? (auth.currentUser.email || 'Unknown') : 'System';
    await addDoc(collection(db, LOGS_COLLECTION), {
      action,
      target,
      user,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    // Silently fail for logs if permissions are strict
    console.warn("Failed to add log (likely permission issue):", e);
  }
};

export const saveCreator = async (data: CreatorFormData, id?: string): Promise<void> => {
  try {
    if (id) {
      // Update existing
      const creatorRef = doc(db, CREATORS_COLLECTION, id);
      await updateDoc(creatorRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      addLog('UPDATE', `Creator: ${data.name}`);
    } else {
      // Create new
      await addDoc(collection(db, CREATORS_COLLECTION), {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      addLog('CREATE', `Creator: ${data.name}`);
    }
  } catch (e) {
    console.error("Error saving creator:", e);
    throw e;
  }
};

export const deleteCreator = async (id: string, name: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CREATORS_COLLECTION, id));
    addLog('DELETE', `Creator: ${name}`);
  } catch (e) {
    console.error("Error deleting creator:", e);
    throw e;
  }
};