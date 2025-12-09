
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { Creator, CreatorFormData, LogEntry, ResourceLink, BrandProduct } from '../types';

const CREATORS_COLLECTION = 'creators';
const LOGS_COLLECTION = 'logs';
const RESOURCES_COLLECTION = 'resources';
const BRANDS_COLLECTION = 'brand_products';

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

export const subscribeToResources = (
  onData: (resources: ResourceLink[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, RESOURCES_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const resources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ResourceLink[];
    onData(resources);
  }, (error) => {
    console.error("Firebase Resources Sync Error:", error);
    if (onError) onError(error);
  });
};

export const subscribeToBrandProducts = (
  onData: (products: BrandProduct[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, BRANDS_COLLECTION), orderBy('lastUpdated', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BrandProduct[];
    onData(products);
  }, (error) => {
    console.error("Firebase Brands Sync Error:", error);
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

export const saveResource = async (data: Omit<ResourceLink, 'id' | 'createdAt' | 'addedBy'>, id?: string): Promise<void> => {
  try {
    const user = auth.currentUser ? (auth.currentUser.email || 'Unknown') : 'System';
    
    if (id) {
      // Update existing resource
      const resourceRef = doc(db, RESOURCES_COLLECTION, id);
      await updateDoc(resourceRef, {
        ...data
      });
      addLog('UPDATE', `Resource Link: ${data.title}`);
    } else {
      // Create new resource
      await addDoc(collection(db, RESOURCES_COLLECTION), {
        ...data,
        addedBy: user.split('@')[0], // Use username part
        createdAt: new Date().toISOString()
      });
      addLog('CREATE', `Resource Link: ${data.title}`);
    }
  } catch (e) {
    console.error("Error saving resource:", e);
    throw e;
  }
};

export const deleteResource = async (id: string, title: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, RESOURCES_COLLECTION, id));
    addLog('DELETE', `Resource Link: ${title}`);
  } catch (e) {
    console.error("Error deleting resource:", e);
    throw e;
  }
};

export const saveBrandProduct = async (data: Omit<BrandProduct, 'id' | 'lastUpdated'>, id?: string): Promise<void> => {
  try {
    if (id) {
      const docRef = doc(db, BRANDS_COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      addLog('UPDATE', `Product: ${data.name}`);
    } else {
      await addDoc(collection(db, BRANDS_COLLECTION), {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      addLog('CREATE', `Product: ${data.name}`);
    }
  } catch (e) {
    console.error("Error saving brand product:", e);
    throw e;
  }
};

export const deleteBrandProduct = async (id: string, name: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, BRANDS_COLLECTION, id));
    addLog('DELETE', `Product: ${name}`);
  } catch (e) {
    console.error("Error deleting brand product:", e);
    throw e;
  }
};

// --- FILE STORAGE ---

export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("File upload failed:", error);
    if (error.code === 'storage/unauthorized') {
      throw new Error(
        "Storage Permission Denied. Go to Firebase Console -> Storage -> Rules and change 'if false;' to 'if request.auth != null;'"
      );
    }
    throw error;
  }
};
