
export interface VideoUpload {
  id: string;
  title: string; // New field for easy tracking
  url: string;
  product: string; // 'Maikalian', 'Xmas Curtain', 'Tshirt'
  views: number;
  likes: number;
  comments: number;
  shares: number;
  dateAdded: string;
}

export interface Creator {
  id: string;
  name: string;
  username: string; 
  niche: string;
  productCategory: string; // This acts as their "Primary Assigned Category"
  email: string;
  phone: string;
  videoLink?: string; // Legacy field, kept for backward compat
  uploads?: VideoUpload[]; // New field for detailed tracking
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  videosCount: number;
  lastUpdated: string;
}

export interface CreatorFormData {
  name: string;
  username: string;
  niche: string;
  productCategory: string;
  email: string;
  phone: string;
  videoLink?: string;
  uploads?: VideoUpload[];
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  videosCount: number;
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description: string;
  addedBy: string;
  createdAt: string;
}

export interface BrandProduct {
  id: string;
  name: string;
  brand: 'Maikalian' | 'Xmas Curtain' | 'Tshirt' | 'Other';
  description: string;
  shopLink: string;
  imageUrl?: string; // Legacy/Main image
  images?: string[]; // New Gallery
  lastUpdated: string;
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
  BRANDS = 'BRANDS',
  TOOLS = 'TOOLS',
  LINKS = 'LINKS',
  LOGS = 'LOGS',
  USERS = 'USERS',
}