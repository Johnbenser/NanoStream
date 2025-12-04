import { User } from '../types';

const USER_KEY = 'nanostream_current_user';
const USERS_DB_KEY = 'nanostream_users_v1';

// ============================================================================
// 🔒 PERMANENT TEAM CONFIGURATION
// Add your team members here to allow them to log in from ANY device/browser.
// Since this is a serverless app, users added via the UI are only saved 
// in that specific browser's Local Storage.
// ============================================================================
export const PERMANENT_USERS: User[] = [
  {
    id: 'sys-benser',
    username: 'gml_benser',
    password: 'jBenser!0203',
    role: 'ADMIN' // Benser is now the Admin
  },
  {
    id: 'sys-francis',
    username: 'gml_francis',
    password: 'francis123',
    role: 'CSR' // Francis is now CSR (Support)
  }
];

export const getUsers = (): User[] => {
  // 1. Get Locally Created Users (Browser-specific)
  const stored = localStorage.getItem(USERS_DB_KEY);
  let localUsers: User[] = [];
  try {
    localUsers = stored ? JSON.parse(stored) : [];
  } catch {
    localUsers = [];
  }

  // 2. Merge Permanent Users + Local Users
  // We use a Map to ensure unique usernames. 
  // We prioritize Local Users if they have the same username (allowing local password changes),
  // but we ensure Permanent Users always exist.
  const userMap = new Map<string, User>();

  // Add Permanent users first
  PERMANENT_USERS.forEach(user => userMap.set(user.username, user));

  // Overlay Local users (allows for local additions)
  // Note: We deliberately don't let local users override permanent ones completely in this logic
  // to ensure the hardcoded credentials always work on fresh devices.
  // If you want to override a permanent user locally, you'd need more complex logic, 
  // but for this use case, we keep them separate or merge carefully.
  localUsers.forEach(user => {
    // Only add local user if it doesn't conflict with a permanent system user ID
    // or if we want to allow local overrides (optional).
    // Here we simply add them.
    if (!PERMANENT_USERS.find(p => p.username === user.username)) {
       userMap.set(user.username, user);
    }
  });

  return Array.from(userMap.values());
};

export const addUser = (user: Omit<User, 'id'>): void => {
  const allUsers = getUsers();
  if (allUsers.find(u => u.username === user.username)) {
    throw new Error('Username already exists');
  }
  
  // We only save the NEW user to local storage.
  const stored = localStorage.getItem(USERS_DB_KEY);
  let localUsers: User[] = stored ? JSON.parse(stored) : [];
  
  const newUser: User = { ...user, id: `local-${Date.now()}` };
  localUsers.push(newUser);
  
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(localUsers));
};

export const deleteUser = (id: string): void => {
  // Check if it's a permanent user
  if (PERMANENT_USERS.find(u => u.id === id)) {
    throw new Error('Cannot delete a System User. Please remove them from authService.ts code.');
  }

  const stored = localStorage.getItem(USERS_DB_KEY);
  if (!stored) return;

  let localUsers: User[] = JSON.parse(stored);
  const initialLength = localUsers.length;
  localUsers = localUsers.filter(u => u.id !== id);

  if (localUsers.length === initialLength) {
     // User wasn't found in local storage (might have been trying to delete a system user improperly)
     throw new Error('User not found in local database.');
  }
  
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(localUsers));
};

export const validateCredentials = (username: string, password: string): boolean => {
  const users = getUsers();
  const valid = users.find(u => u.username === username && u.password === password);
  return !!valid;
};

export const login = (username: string): void => {
  localStorage.setItem(USER_KEY, username);
};

export const logout = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const getCurrentUser = (): string | null => {
  return localStorage.getItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem(USER_KEY);
};

export const getCurrentUserRole = (): 'ADMIN' | 'EDITOR' | 'CSR' => {
  const username = getCurrentUser();
  if (!username) return 'EDITOR';
  
  // Need to fetch full user object to get role
  const users = getUsers();
  const user = users.find(u => u.username === username);
  return user ? user.role : 'EDITOR';
};

export const isSystemUser = (id: string): boolean => {
  return !!PERMANENT_USERS.find(u => u.id === id);
};