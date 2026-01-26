
export interface VideoUpload {
  id: string;
  title: string; 
  url: string;
  product: string; // Acts as Category (e.g. 'Maikalian', 'Xmas Curtain')
  productName?: string; // Specific item name
  views: number;
  likes: number;
  comments: number;
  shares: number;
  dateAdded: string;
  
  // Advanced Brand Metrics
  newFollowers?: number;
  avgWatchTime?: string; // e.g. "15s" or "0:15"
  watchedFullVideo?: number; // percentage (0-100)
  itemsSold?: number;
}

export interface DemographicData {
  gender: { name: string; value: number }[];
  territories: { country: string; value: number }[];
  history: { date: string; followers: number }[];
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
  tiktokLink?: string; // New field for Client Brand Profile
  uploads?: VideoUpload[]; // New field for detailed tracking
  demographics?: DemographicData;
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
  tiktokLink?: string;
  uploads?: VideoUpload[];
  demographics?: DemographicData;
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

export interface ReportedVideo {
  id: string;
  creatorId: string;
  creatorName: string;
  videoTitle: string;
  videoUrl: string; // Uploaded file or external link
  productCategory: string; // New field for filtering
  violationType: string; // e.g., 'Copyright', 'Guideline Violation', 'Low Quality'
  sanctions: string;
  actionPlan: string;
  remarks: string; // Renamed from lessonsLearned
  status: 'OPEN' | 'RESOLVED' | 'APPEAL';
  dateReported: string;
}

export interface FGSoraError {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: string;
  description: string;
  steps: string;
  imageUrl?: string;
  timestamp: string; // Full ISO for sorting
}

export interface ContentPlan {
  id: string;
  title: string;
  date: string; // ISO Date YYYY-MM-DD
  time?: string; // HH:mm
  productName?: string;
  promptDetails?: string;
  clientId?: string; // Link to Client Workspace
  clientName?: string;
  status: 'IDEA' | 'SCRIPTING' | 'FILMING' | 'EDITING' | 'READY' | 'POSTED';
  notes: string;
  platform: 'TikTok' | 'Instagram' | 'YouTube';
  createdAt: string;
}

export interface VaultAccount {
  id: string;
  platform: string; // e.g., 'TikTok'
  username: string;
  password?: string; // Main/Platform Password
  emailPassword?: string; // Secondary/Outlook Password
  secretKey?: string; // TOTP Secret
  notes?: string;
  updatedAt: string;
}

export interface AnalysisResult {
  summary: string;
  assumptions: string[];
  topPerformers: string[];
  growthOpportunities: string[];
  audienceDemographics: string[];
}

export interface ReportAnalysisResult {
  summary: string;
  mainReasons: string[];
  recommendations: string[];
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
  strategy: string;
}

export interface ViralReportResult {
  viralityScore: number; // 0-100
  hookAnalysis: string;
  engagementQuality: string;
  whyItWorked: string[];
  nextSteps: string[];
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
  email?: string;
  createdAt?: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CLIENTS = 'CLIENTS', 
  CREATORS = 'CREATORS',
  BRANDS = 'BRANDS',
  TOOLS = 'TOOLS',
  PLANNER = 'PLANNER', 
  VIRAL_REPORT = 'VIRAL_REPORT', 
  REPORTS = 'REPORTS',
  LINKS = 'LINKS',
  LOGS = 'LOGS',
  USERS = 'USERS',
  VAULT = 'VAULT', // New View
}
