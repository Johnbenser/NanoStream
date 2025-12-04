import { Creator, CreatorFormData, LogEntry } from '../types';
import { getCurrentUser } from './authService';

const STORAGE_KEY = 'nanostream_creators_v1';
const LOGS_KEY = 'nanostream_logs_v1';

// Seed data to make the app look good initially
const SEED_DATA: Creator[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    niche: 'Lifestyle & Wellness',
    email: 'sarah.j@example.com',
    phone: '+1-555-0101',
    videoLink: 'https://www.tiktok.com/@sarahjenkins/video/7285619234567',
    avgViews: 12500,
    avgLikes: 2300,
    avgComments: 145,
    videosCount: 15,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'TechWithMike',
    niche: 'Tech Reviews',
    email: 'mike.tech@example.com',
    phone: '+1-555-0102',
    videoLink: '',
    avgViews: 45000,
    avgLikes: 5600,
    avgComments: 890,
    videosCount: 8,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Chef Bella',
    niche: 'Cooking',
    email: 'bella.cooks@example.com',
    phone: '+1-555-0103',
    videoLink: 'https://www.instagram.com/reel/Cxyz123abc',
    avgViews: 8900,
    avgLikes: 1200,
    avgComments: 60,
    videosCount: 22,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Travel Tom',
    niche: 'Travel',
    email: 'tom.t@example.com',
    phone: '+1-555-0104',
    avgViews: 28000,
    avgLikes: 3400,
    avgComments: 210,
    videosCount: 5,
    lastUpdated: new Date().toISOString(),
  },
];

export const getCreators = (): Creator[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  try {
    const parsed = JSON.parse(stored);
    // Critical fix: Ensure we return an array, otherwise .map will fail
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse storage", e);
    return [];
  }
};

// Logs Helper
export const getLogs = (): LogEntry[] => {
  const stored = localStorage.getItem(LOGS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    // Critical fix: Ensure we return an array
    const logs = Array.isArray(parsed) ? parsed : [];
    
    return logs.sort((a: LogEntry, b: LogEntry) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (e) {
    return [];
  }
};

export const addLog = (action: LogEntry['action'], target: string): void => {
  const logs = getLogs();
  const user = getCurrentUser() || 'Unknown';
  
  const newLog: LogEntry = {
    id: Date.now().toString() + Math.random().toString().slice(2, 5),
    action,
    target,
    user,
    timestamp: new Date().toISOString()
  };
  
  // Keep last 100 logs
  const updatedLogs = [newLog, ...logs].slice(0, 100);
  localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
};

export const saveCreator = (data: CreatorFormData, id?: string): void => {
  const creators = getCreators();
  if (id) {
    // Update
    const index = creators.findIndex((c) => c.id === id);
    if (index !== -1) {
      creators[index] = { ...creators[index], ...data, lastUpdated: new Date().toISOString() };
      addLog('UPDATE', `Creator: ${data.name}`);
    }
  } else {
    // Create
    const newCreator: Creator = {
      ...data,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString(),
    };
    creators.push(newCreator);
    addLog('CREATE', `Creator: ${data.name}`);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
};

export const deleteCreator = (id: string): void => {
  let creators = getCreators();
  const targetId = String(id);
  
  // Find name for logging before deletion
  const creatorToDelete = creators.find(c => String(c.id) === targetId);
  const name = creatorToDelete ? creatorToDelete.name : 'Unknown';

  const initialLength = creators.length;
  creators = creators.filter(c => String(c.id) !== targetId);
  
  if (creators.length === initialLength) {
    console.warn(`Delete failed: Creator with ID ${id} not found.`);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
  addLog('DELETE', `Creator: ${name}`);
  console.log(`Deleted creator ${name} (${id})`);
};