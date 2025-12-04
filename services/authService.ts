import { User } from '../types';

const USER_KEY = 'nanostream_current_user';
const USERS_DB_KEY = 'nanostream_users_v1';

// Seed Admin User
const SEED_USER: User = {
  id: '1',
  username: 'admin',
  password: 'admin123',
  role: 'ADMIN'
};

// Initialize Users DB if empty
const initUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_DB_KEY);
  if (!stored) {
    const initial = [SEED_USER];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [SEED_USER];
  }
};

export const getUsers = (): User[] => {
  return initUsers();
};

export const addUser = (user: Omit<User, 'id'>): void => {
  const users = getUsers();
  if (users.find(u => u.username === user.username)) {
    throw new Error('Username already exists');
  }
  const newUser: User = { ...user, id: Date.now().toString() };
  users.push(newUser);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

export const deleteUser = (id: string): void => {
  const users = getUsers();
  // Prevent deleting the last admin or the seed admin if desired, but for now just filter
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === 0) {
     throw new Error('Cannot delete the last user.');
  }
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(filtered));
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

export const getCurrentUserRole = (): 'ADMIN' | 'EDITOR' => {
  const username = getCurrentUser();
  if (!username) return 'EDITOR';
  const users = getUsers();
  const user = users.find(u => u.username === username);
  return user ? user.role : 'EDITOR';
};