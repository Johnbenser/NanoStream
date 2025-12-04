export interface Creator {
  id: string;
  name: string;
  niche: string;
  email: string;
  phone: string;
  videoLink?: string; // New field
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  videosCount: number;
  lastUpdated: string;
}

export interface CreatorFormData {
  name: string;
  niche: string;
  email: string;
  phone: string;
  videoLink?: string; // New field
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  videosCount: number;
}

export interface AnalysisResult {
  summary: string;
  assumptions: string[];
  topPerformers: string[];
  growthOpportunities: string[];
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
  strategy: string;
}

export interface LogEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT';
  target: string;
  user: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  password: string; // stored plainly for this demo
  role: 'ADMIN' | 'EDITOR' | 'CSR';
  lastLogin?: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CREATORS = 'CREATORS',
  TOOLS = 'TOOLS',
  LOGS = 'LOGS',
  USERS = 'USERS',
}