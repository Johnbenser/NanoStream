
export interface Creator {
  id: string;
  name: string;
  username: string; // New field
  niche: string;
  productCategory: string; // New field: 'Maikalian', 'Xmas Curtain', 'Tshirt', etc.
  email: string;
  phone: string;
  videoLink?: string; 
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  videosCount: number;
  lastUpdated: string;
}

export interface CreatorFormData {
  name: string;
  username: string; // New field
  niche: string;
  productCategory: string; // New field
  email: string;
  phone: string;
  videoLink?: string;
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
  audienceDemographics: string[];
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
