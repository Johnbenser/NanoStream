
import { db, auth, storage } from './firebase';
import { 
  collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, query, orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Creator, CreatorFormData, ResourceLink, BrandProduct, ReportedVideo, 
  FGSoraError, ContentPlan, LogEntry, VaultAccount, PublicAsset, PublicNote
} from '../types';

const CREATORS_COLLECTION = 'creators';
const CLIENTS_COLLECTION = 'clients';
const RESOURCES_COLLECTION = 'resources';
const BRANDS_COLLECTION = 'brand_products';
const REPORTS_COLLECTION = 'reported_videos';
const ERRORS_COLLECTION = 'fgsora_errors';
const PLANS_COLLECTION = 'content_plans';
const LOGS_COLLECTION = 'activity_logs';
const VAULT_COLLECTION = 'account_vault';
const ASSETS_COLLECTION = 'public_assets';
const PUBLIC_NOTES_COLLECTION = 'public_notes';
const SETTINGS_COLLECTION = 'settings';

// --- LOGGING HELPER ---
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
    console.warn("Failed to add log:", e);
  }
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
  }, onError);
};

// --- SETTINGS / GLOBAL ---
export const subscribeToGlobalSheetId = (
  onData: (id: string | null) => void
) => {
  const docRef = doc(db, SETTINGS_COLLECTION, 'fgsora_config');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onData(docSnap.data().sheetId || null);
    } else {
      onData(null);
    }
  }, (error) => {
    console.warn("Settings sync warning:", error.code);
    onData(null);
  });
};

export const saveGlobalSheetId = async (id: string | null): Promise<void> => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'fgsora_config'), {
      sheetId: id,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error("Error saving global sheet ID:", e);
    throw e;
  }
};

export const subscribeToDeviceOrder = (
  onData: (order: string[]) => void
) => {
  const docRef = doc(db, SETTINGS_COLLECTION, 'vault_device_order');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onData(docSnap.data().order || []);
    } else {
      onData([]);
    }
  }, (error) => {
    console.warn("Device order sync warning:", error.code);
  });
};

export const saveDeviceOrder = async (order: string[]): Promise<void> => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'vault_device_order'), {
      order,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error("Error saving device order:", e);
    throw e;
  }
};

// --- CREATORS ---
export const subscribeToCreators = (
  onData: (creators: Creator[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, CREATORS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const creators = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Creator[];
    onData(creators);
  }, onError);
};

export const saveCreator = async (data: CreatorFormData, id?: string): Promise<void> => {
  if (id) {
    await updateDoc(doc(db, CREATORS_COLLECTION, id), { ...data, lastUpdated: new Date().toISOString() });
    await addLog('UPDATE', `Updated creator: ${data.name}`);
  } else {
    await addDoc(collection(db, CREATORS_COLLECTION), { ...data, lastUpdated: new Date().toISOString() });
    await addLog('CREATE', `Created creator: ${data.name}`);
  }
};

export const deleteCreator = async (id: string, name: string): Promise<void> => {
  await deleteDoc(doc(db, CREATORS_COLLECTION, id));
  await addLog('DELETE', `Deleted creator: ${name}`);
};

// --- CLIENTS ---
export const subscribeToClients = (
  onData: (clients: Creator[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, CLIENTS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Creator[];
    onData(clients);
  }, onError);
};

export const saveClient = async (data: CreatorFormData, id?: string): Promise<void> => {
  if (id) {
    await updateDoc(doc(db, CLIENTS_COLLECTION, id), { ...data, lastUpdated: new Date().toISOString() });
    await addLog('UPDATE', `Updated client: ${data.name}`);
  } else {
    await addDoc(collection(db, CLIENTS_COLLECTION), { ...data, lastUpdated: new Date().toISOString() });
    await addLog('CREATE', `Created client: ${data.name}`);
  }
};

export const deleteClient = async (id: string, name: string): Promise<void> => {
  await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
  await addLog('DELETE', `Deleted client: ${name}`);
};

// --- RESOURCES ---
export const subscribeToResources = (
  onData: (links: ResourceLink[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, RESOURCES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const links = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ResourceLink[];
    onData(links);
  }, onError);
};

export const saveResource = async (data: Omit<ResourceLink, 'id' | 'createdAt' | 'addedBy'>, id?: string): Promise<void> => {
  const user = auth.currentUser ? (auth.currentUser.email || 'Unknown') : 'System';
  if (id) {
    await updateDoc(doc(db, RESOURCES_COLLECTION, id), { ...data });
    await addLog('UPDATE', `Updated resource: ${data.title}`);
  } else {
    await addDoc(collection(db, RESOURCES_COLLECTION), {
      ...data,
      addedBy: user,
      createdAt: new Date().toISOString()
    });
    await addLog('CREATE', `Added resource: ${data.title}`);
  }
};

export const deleteResource = async (id: string, title: string): Promise<void> => {
  await deleteDoc(doc(db, RESOURCES_COLLECTION, id));
  await addLog('DELETE', `Deleted resource: ${title}`);
};

// --- BRANDS / PRODUCTS ---
export const subscribeToBrandProducts = (
  onData: (products: BrandProduct[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, BRANDS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BrandProduct[];
    onData(products);
  }, onError);
};

export const saveBrandProduct = async (data: any, id?: string): Promise<void> => {
  if (id) {
    await updateDoc(doc(db, BRANDS_COLLECTION, id), { ...data, lastUpdated: new Date().toISOString() });
    await addLog('UPDATE', `Updated product: ${data.name}`);
  } else {
    await addDoc(collection(db, BRANDS_COLLECTION), { ...data, lastUpdated: new Date().toISOString() });
    await addLog('CREATE', `Created product: ${data.name}`);
  }
};

export const deleteBrandProduct = async (id: string, name: string): Promise<void> => {
  await deleteDoc(doc(db, BRANDS_COLLECTION, id));
  await addLog('DELETE', `Deleted product: ${name}`);
};

// --- REPORTED CONTENT ---
export const subscribeToReports = (
  onData: (reports: ReportedVideo[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, REPORTS_COLLECTION), orderBy('dateReported', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReportedVideo[];
    onData(reports);
  }, onError);
};

export const saveReport = async (data: any, id?: string): Promise<void> => {
  if (id) {
    await updateDoc(doc(db, REPORTS_COLLECTION, id), data);
    await addLog('UPDATE', `Updated report for: ${data.videoTitle}`);
  } else {
    await addDoc(collection(db, REPORTS_COLLECTION), data);
    await addLog('CREATE', `Reported video: ${data.videoTitle}`);
  }
};

export const deleteReport = async (id: string, title: string): Promise<void> => {
  await deleteDoc(doc(db, REPORTS_COLLECTION, id));
  await addLog('DELETE', `Deleted report for: ${title}`);
};

// --- CONTENT PLANS ---
export const subscribeToContentPlans = (
  onData: (plans: ContentPlan[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, PLANS_COLLECTION), orderBy('date', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContentPlan[];
    onData(plans);
  }, onError);
};

export const saveContentPlan = async (data: any, id?: string): Promise<void> => {
  if (id) {
    await updateDoc(doc(db, PLANS_COLLECTION, id), data);
    await addLog('UPDATE', `Updated plan: ${data.title}`);
  } else {
    await addDoc(collection(db, PLANS_COLLECTION), { ...data, createdAt: new Date().toISOString() });
    await addLog('CREATE', `Planned content: ${data.title}`);
  }
};

export const deleteContentPlan = async (id: string, title: string): Promise<void> => {
  await deleteDoc(doc(db, PLANS_COLLECTION, id));
  await addLog('DELETE', `Deleted plan: ${title}`);
};

// --- FG SORA ERRORS ---
export const subscribeToFGSoraErrors = (
  onData: (errors: FGSoraError[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, ERRORS_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const errors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FGSoraError[];
    onData(errors);
  }, onError);
};

export const saveFGSoraError = async (data: any): Promise<void> => {
  await addDoc(collection(db, ERRORS_COLLECTION), { ...data, timestamp: new Date().toISOString() });
  await addLog('CREATE', `Logged error: ${data.category}`);
};

export const deleteFGSoraError = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, ERRORS_COLLECTION, id));
  await addLog('DELETE', `Deleted error log`);
};

// --- ACCOUNT VAULT ---
export const subscribeToVault = (
  onData: (accounts: VaultAccount[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, VAULT_COLLECTION), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VaultAccount[];
    onData(accounts);
  }, (error) => {
    console.error("Vault Sync Error:", error);
    if(onError) onError(error);
  });
};

export const saveVaultAccount = async (data: any, id?: string): Promise<void> => {
  if (id) {
    await updateDoc(doc(db, VAULT_COLLECTION, id), { ...data, updatedAt: new Date().toISOString() });
    await addLog('UPDATE', `Updated vault account: ${data.username}`);
  } else {
    await addDoc(collection(db, VAULT_COLLECTION), { ...data, updatedAt: new Date().toISOString() });
    await addLog('CREATE', `Added vault account: ${data.username}`);
  }
};

export const deleteVaultAccount = async (id: string, username: string): Promise<void> => {
  await deleteDoc(doc(db, VAULT_COLLECTION, id));
  await addLog('DELETE', `Deleted vault account: ${username}`);
};

// --- PUBLIC ASSETS (Image Host) ---
export const subscribeToAssets = (
  onData: (assets: PublicAsset[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, ASSETS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const assets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PublicAsset[];
    onData(assets);
  }, onError);
};

export const saveAsset = async (asset: Omit<PublicAsset, 'id'>): Promise<void> => {
  await addDoc(collection(db, ASSETS_COLLECTION), asset);
  await addLog('CREATE', `Uploaded asset: ${asset.name}`);
};

export const deleteAsset = async (id: string, url: string, name: string): Promise<void> => {
  // 1. Delete from Storage
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (e) {
    console.warn("Could not delete from storage (might already be gone)", e);
  }
  
  // 2. Delete from Firestore
  await deleteDoc(doc(db, ASSETS_COLLECTION, id));
  await addLog('DELETE', `Deleted asset: ${name}`);
};

// --- PUBLIC NOTEPAD ---
export const subscribeToPublicNote = (
  id: string,
  onData: (note: PublicNote | null) => void
) => {
  return onSnapshot(doc(db, PUBLIC_NOTES_COLLECTION, id), (docSnap) => {
    if (docSnap.exists()) {
      onData({ id: docSnap.id, ...docSnap.data() } as PublicNote);
    } else {
      onData(null);
    }
  });
};

export const savePublicNote = async (id: string, content: string): Promise<void> => {
  // Use setDoc with merge to create if not exists or update
  await setDoc(doc(db, PUBLIC_NOTES_COLLECTION, id), {
    content,
    lastUpdated: new Date().toISOString()
  }, { merge: true });
};

// --- STORAGE UTILS ---
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
