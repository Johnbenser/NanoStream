import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, LayoutGrid, Table as TableIcon,
  AlertTriangle, ExternalLink, X, Cloud, User as UserIcon, Tag, PlayCircle, Share2, Heart, Video, Type, Calendar, FileSpreadsheet, DollarSign, Clock, Brain, Loader2, RefreshCw, CheckCircle, Target, Users, Upload, FileText, Globe, Activity, Eye, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { Creator, CreatorFormData, VideoUpload, AnalysisResult, DemographicData } from '../types';
import { saveCreator, deleteCreator } from '../services/storageService';
import { analyzeCreatorData } from '../services/geminiService';

interface CreatorListProps {
  creators: Creator[];
  onRefresh?: () => void;
  currentUser?: string;
}

const PRODUCT_CATEGORIES = ['Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];
const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

const CreatorList: React.FC<CreatorListProps> = ({ creators, currentUser }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'management'>('overview');

  // Main View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Analysis State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Creator CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '', username: '', niche: '', productCategory: 'Maikalian',
    email: '', phone: '', videoLink: '', avgViews: 0, avgLikes: 0, 
    avgComments: 0, avgShares: 0, videosCount: 0, uploads: []
  });

  // Video Library / Manager State
  const [libraryCreator, setLibraryCreator] = useState<Creator | null>(null);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'videos' | 'demographics'>('videos');
  const [videoFormData, setVideoFormData] = useState<Partial<VideoUpload>>({
    title: '', url: '', product: 'Maikalian', productName: '',
    views: 0, likes: 0, comments: 0, shares: 0,
    newFollowers: 0, avgWatchTime: '', watchedFullVideo: 0, itemsSold: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // --- ANALYTICS AGGREGATION ---
  const metrics = useMemo(() => {
    let totalViews = 0;
    let totalLikes = 0;
    let totalShares = 0;
    let totalSold = 0;

    const creatorPerformance = creators.map(c => ({
        name: c.name,
        views: c.avgViews,
        likes: c.avgLikes,
        shares: c.avgShares,
        // Calculate items sold from uploads if available
        items: c.uploads?.reduce((sum, u) => sum + (u.itemsSold || 0), 0) || 0
    }));

    creators.forEach(c => {
        totalViews += c.avgViews;
        totalLikes += c.avgLikes;
        totalShares += c.avgShares;
        if(c.uploads) {
            totalSold += c.uploads.reduce((sum, u) => sum + (u.itemsSold || 0), 0);
        }
    });

    const totalEngagement = totalLikes + totalShares; // Simplified for card
    const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : "0.00";

    const topByViews = [...creatorPerformance].sort((a,b) => b.views - a.views).slice(0, 5);
    const topBySales = [...creatorPerformance].sort((a,b) => b.items - a.items).slice(0, 5);

    // Aggregate Demographics
    let genderAgg: Record<string, number> = { Female: 0, Male: 0 };
    let territoryAgg: Record<string, number> = {};
    let demoCount = 0;

    creators.forEach(c => {
        if (c.demographics) {
            demoCount++;
            c.demographics.gender.forEach(g => {
                const key = g.name === 'Female' || g.name === 'Male' ? g.name : 'Other';
                genderAgg[key] = (genderAgg[key] || 0) + g.value;
            });
            c.demographics.territories.forEach(t => {
                territoryAgg[t.country] = (territoryAgg[t.country] || 0) + t.value;
            });
        }
    });

    const genderData = demoCount > 0 
        ? Object.entries(genderAgg).map(([name, val]) => ({ name, value: Math.round(val / demoCount) }))
        : [];
    
    const territoryData = demoCount > 0
        ? Object.entries(territoryAgg)
            .map(([country, val]) => ({ country, value: Math.round(val / demoCount) }))
            .sort((a,b) => b.value - a.value).slice(0, 5)
        : [];

    return {
        totalViews,
        totalLikes,
        totalShares,
        totalSold,
        engagementRate,
        topByViews,
        topBySales,
        genderData,
        territoryData
    };
  }, [creators]);

  // --- AI ANALYSIS ---
  const handleAnalyze = async () => {
    if (creators.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
        const result = await analyzeCreatorData(creators);
        setAnalysis(result);
    } catch (error: any) {
        setAnalysisError("Failed to generate AI insights. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- EXCEL IMPORT ---
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !libraryCreator) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        let newDemographics: DemographicData = {
            gender: [],
            territories: [],
            history: []
        };

        const findCol = (row: any[], keywords: string[]) => {
            return row.findIndex((cell: any) => 
                cell && keywords.some(k => String(cell).toLowerCase().includes(k))
            );
        };

        wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            if (data.length < 2) return;

            // Gender
            if (sheetName.toLowerCase().includes('gender') || sheetName.toLowerCase().includes('demo')) {
                const header = data[0];
                const genderCol = findCol(header, ['gender', 'sex']);
                const valCol = findCol(header, ['percent', 'count', 'value', '%']);
                if (genderCol > -1 && valCol > -1) {
                    newDemographics.gender = data.slice(1).map(row => ({
                        name: row[genderCol],
                        value: Number(row[valCol])
                    })).filter(d => d.name && !isNaN(d.value));
                }
            }

            // Territory
            if (sheetName.toLowerCase().includes('territory') || sheetName.toLowerCase().includes('country') || sheetName.toLowerCase().includes('location')) {
                const header = data[0];
                const nameCol = findCol(header, ['country', 'territory', 'region', 'name']);
                const valCol = findCol(header, ['percent', 'count', 'value', '%']);
                if (nameCol > -1 && valCol > -1) {
                    newDemographics.territories = data.slice(1).map(row => ({
                        country: row[nameCol],
                        value: Number(row[valCol])
                    })).filter(d => d.country && !isNaN(d.value)).slice(0, 10);
                }
            }

            // History
            if (sheetName.toLowerCase().includes('history') || sheetName.toLowerCase().includes('growth') || sheetName.toLowerCase().includes('follower')) {
                const header = data[0];
                const dateCol = findCol(header, ['date', 'time', 'day']);
                const valCol = findCol(header, ['follower', 'count', 'total']);
                if (dateCol > -1 && valCol > -1) {
                    newDemographics.history = data.slice(1).map(row => {
                        let dateStr = row[dateCol];
                        if (typeof dateStr === 'number') {
                            dateStr = new Date((dateStr - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
                        }
                        return {
                            date: String(dateStr),
                            followers: Number(row[valCol])
                        };
                    }).filter(d => d.date && !isNaN(d.followers));
                }
            }
        });

        if (newDemographics.gender.length > 0 || newDemographics.territories.length > 0) {
            const updatedCreator = { ...libraryCreator, demographics: newDemographics };
            
            const formDataToSave: CreatorFormData = {
                name: updatedCreator.name,
                username: updatedCreator.username,
                niche: updatedCreator.niche,
                productCategory: updatedCreator.productCategory,
                email: updatedCreator.email,
                phone: updatedCreator.phone,
                videoLink: updatedCreator.videoLink,
                uploads: updatedCreator.uploads,
                demographics: newDemographics,
                avgViews: updatedCreator.avgViews,
                avgLikes: updatedCreator.avgLikes,
                avgComments: updatedCreator.avgComments,
                avgShares: updatedCreator.avgShares,
                videosCount: updatedCreator.videosCount
            };

            await saveCreator(formDataToSave, libraryCreator.id);
            setLibraryCreator(updatedCreator);
            alert("Creator demographics updated successfully!");
        } else {
            alert("No structured data found. Ensure sheets are named 'Gender', 'Territories', or 'History'.");
        }
    };
    reader.readAsBinaryString(file);
  };

  // --- CREATOR ACTIONS ---

  const handleOpenModal = (creator?: Creator) => {
    if (creator) {
      setEditingId(creator.id);
      setFormData({
        name: creator.name,
        username: creator.username || '',
        niche: creator.niche,
        productCategory: creator.productCategory || 'Maikalian',
        email: creator.email,
        phone: creator.phone,
        videoLink: creator.videoLink || '',
        uploads: creator.uploads || [],
        avgViews: creator.avgViews,
        avgLikes: creator.avgLikes,
        avgComments: creator.avgComments,
        avgShares: creator.avgShares || 0,
        videosCount: creator.videosCount,
        demographics: creator.demographics // Populate demographics if exists
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', username: '', niche: '', productCategory: 'Maikalian',
        email: '', phone: '', videoLink: '', uploads: [],
        avgViews: 0, avgLikes: 0, avgComments: 0, avgShares: 0, videosCount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCreator(formData, editingId || undefined);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (deleteId && deleteName) {
      await deleteCreator(deleteId, deleteName);
      setDeleteId(null);
      setDeleteName(null);
    }
  };

  // --- VIDEO LIBRARY ACTIONS ---

  const openLibrary = (creator: Creator) => {
    setLibraryCreator(creator);
    setIsVideoFormOpen(false);
    setActiveLibraryTab('videos');
  };

  const openVideoForm = (video?: VideoUpload) => {
    if (video) {
        setEditingVideoId(video.id);
        setVideoFormData({ 
            ...video,
            // Format for date input (YYYY-MM-DD)
            dateAdded: video.dateAdded ? video.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]
        });
    } else {
        setEditingVideoId(null);
        setVideoFormData({ 
            title: '', url: '', product: 'Maikalian', productName: '',
            views: 0, likes: 0, comments: 0, shares: 0,
            newFollowers: 0, avgWatchTime: '', watchedFullVideo: 0, itemsSold: 0,
            dateAdded: new Date().toISOString().split('T')[0]
        });
    }
    setIsVideoFormOpen(true);
  };

  const saveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryCreator) return;

    // Create a copy of existing uploads
    let updatedUploads = [...(libraryCreator.uploads || [])];
    
    // Prepare proper ISO string for date
    const finalDate = videoFormData.dateAdded 
        ? new Date(videoFormData.dateAdded).toISOString() 
        : new Date().toISOString();

    if (editingVideoId) {
        // Update existing
        updatedUploads = updatedUploads.map(u => 
            u.id === editingVideoId ? { 
                ...u, 
                ...videoFormData as VideoUpload,
                dateAdded: finalDate
            } : u
        );
    } else {
        // Add new
        const newVideo: VideoUpload = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            dateAdded: finalDate,
            title: videoFormData.title || 'Untitled Video',
            url: videoFormData.url || '',
            product: videoFormData.product || 'Maikalian',
            productName: videoFormData.productName,
            views: videoFormData.views || 0,
            likes: videoFormData.likes || 0,
            comments: videoFormData.comments || 0,
            shares: videoFormData.shares || 0,
            newFollowers: videoFormData.newFollowers,
            avgWatchTime: videoFormData.avgWatchTime,
            watchedFullVideo: videoFormData.watchedFullVideo,
            itemsSold: videoFormData.itemsSold
        };
        updatedUploads.push(newVideo);
    }

    // Recalculate SUMS (Total) instead of Averages
    const count = updatedUploads.length;
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedCreator: CreatorFormData = {
        name: libraryCreator.name,
        username: libraryCreator.username,
        niche: libraryCreator.niche,
        productCategory: libraryCreator.productCategory,
        email: libraryCreator.email,
        phone: libraryCreator.phone,
        // Update legacy link to latest upload if exists
        videoLink: count > 0 ? updatedUploads[count-1].url : '',
        uploads: updatedUploads,
        demographics: libraryCreator.demographics,
        // NOTE: Keeping property names 'avgViews' etc for DB compatibility, but storing TOTALS now.
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: count
    };

    await saveCreator(updatedCreator, libraryCreator.id);
    
    // Update local state to reflect changes immediately in modal
    setLibraryCreator({ ...libraryCreator, ...updatedCreator } as Creator);
    setIsVideoFormOpen(false);
  };

  const deleteVideo = async (videoId: string, e: React.MouseEvent) => {
    // 1. Immediate Event Killing
    e.preventDefault();
    e.stopPropagation();
    
    if (!libraryCreator || !libraryCreator.id) return;
    if (!window.confirm("Are you sure you want to delete this video log?")) return;

    // Snapshot for rollback
    const previousState = { ...libraryCreator }; 

    try {
        // 2. Prepare new data safely
        const currentUploads = libraryCreator.uploads || [];
        // Use String conversion for safety when comparing IDs
        const updatedUploads = currentUploads.filter(u => String(u.id) !== String(videoId));

        // Recalculate SUMS (Total)
        const count = updatedUploads.length;
        const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
        const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
        const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
        const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

        const updatedCreatorData = {
            ...libraryCreator,
            uploads: updatedUploads,
            demographics: libraryCreator.demographics,
            avgViews: totalViews,
            avgLikes: totalLikes,
            avgComments: totalComments,
            avgShares: totalShares,
            videosCount: count
        };

        // 3. Optimistic UI Update (Instant Feedback)
        setLibraryCreator(updatedCreatorData as Creator);

        // 4. DB Update
        const formDataToSave: CreatorFormData = {
            name: updatedCreatorData.name,
            username: updatedCreatorData.username,
            niche: updatedCreatorData.niche,
            productCategory: updatedCreatorData.productCategory,
            email: updatedCreatorData.email,
            phone: updatedCreatorData.phone,
            videoLink: count > 0 ? updatedUploads[count-1].url : '',
            uploads: updatedUploads,
            demographics: updatedCreatorData.demographics,
            avgViews: totalViews,
            avgLikes: totalLikes,
            avgComments: totalComments,
            avgShares: totalShares,
            videosCount: count
        };

        await saveCreator(formDataToSave, libraryCreator.id);
    } catch (error) {
        console.error("Failed to delete video:", error);
        alert("Failed to delete video. Please check connection.");
        // Rollback
        setLibraryCreator(previousState as Creator);
    }
  };

  // --- EXPORT LOGIC ---
  const handleExportExcel = () => {
    const generateDate = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];

    // CSS Styles for the Excel file
    const tableStyle = `
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; }
        .header-container { padding: 20px 0; border-bottom: 3px solid #6d28d9; margin-bottom: 20px; }
        .brand-text { color: #4c1d95; font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; }
        .campaign-text { color: #000000; font-size: 16px; font-weight: bold; margin-top: 5px; }
        .meta-data { color: #374151; font-size: 11px; margin-top: 15px; font-family: monospace; }
        table { border-collapse: collapse; width: 100%; border: 1px solid #e5e7eb; }
        th { background-color: #4c1d95; color: white; padding: 12px 10px; font-weight: bold; font-size: 11px; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 11px; }
        .num { text-align: right; font-family: 'Courier New', monospace; font-weight: bold; }
        .product-col { background-color: #f5f3ff; color: #4c1d95; font-weight: bold; }
      </style>
    `;

    const tableRows = creators.map(c => {
      let maikalianViews = 0, curtainViews = 0, tshirtViews = 0;
      if (c.uploads) {
        c.uploads.forEach(u => {
            if (u.product === 'Maikalian') maikalianViews += u.views;
            if (u.product === 'Xmas Curtain') curtainViews += u.views;
            if (u.product === 'Tshirt') tshirtViews += u.views;
        });
      }
      return `
      <tr>
        <td style="font-weight:bold; font-size: 12px;">${c.name}</td>
        <td>${c.username || '-'}</td>
        <td>${c.niche}</td>
        <td class="num product-col">${maikalianViews.toLocaleString()}</td>
        <td class="num product-col">${curtainViews.toLocaleString()}</td>
        <td class="num product-col">${tshirtViews.toLocaleString()}</td>
        <td class="num">${c.avgLikes.toLocaleString()}</td>
        <td class="num">${c.avgViews.toLocaleString()}</td>
        <td class="num">${c.videosCount}</td>
      </tr>
    `}).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        ${tableStyle}
      </head>
      <body>
        <div class="header-container">
          <div class="brand-text">Global Media Live</div>
          <div class="campaign-text">A.I Content Campaign Monitoring</div>
          <div class="meta-data">Generated by : GML_System | Date: ${generateDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Niche</th>
              <th>Maikalian Views</th>
              <th>Curtain Views</th>
              <th>Tshirt Views</th>
              <th>Total Likes</th>
              <th>Total Views</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GML_Creator_Report_${dateStr}.xls`;
    link.click();
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Username', 'Niche', 'Category', 'Total Views', 'Total Likes', 'Total Comments', 'Total Shares', 'Total Videos'];
    const csvContent = [
      headers.join(','),
      ...creators.map(c => [
        `"${c.name}"`, `"${c.username}"`, `"${c.niche}"`, `"${c.productCategory}"`,
        c.avgViews, c.avgLikes, c.avgComments, c.avgShares || 0, c.videosCount
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredCreators = creators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.username && c.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex items-center gap-2 text-purple-200 text-sm">
        <Cloud className="w-4 h-4" />
        Creator metrics are automatically synced to Firebase Cloud Database.
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-700 space-x-6">
        <button 
           onClick={() => setActiveTab('overview')}
           className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === 'overview' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
            Analytics Overview
            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
        </button>
        <button 
           onClick={() => setActiveTab('management')}
           className={`pb-4 px-2 text-sm font-bold transition-colors relative ${activeTab === 'management' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
            Creator Management
            {activeTab === 'management' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide">Total Creator Views</h3>
                        <div className="bg-purple-500/20 p-2 rounded-lg"><Eye className="w-4 h-4 text-purple-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-white">{metrics.totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide">Engagement Rate</h3>
                        <div className="bg-blue-500/20 p-2 rounded-lg"><Activity className="w-4 h-4 text-blue-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-white">{metrics.engagementRate}%</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide">Total Sold</h3>
                        <div className="bg-green-500/20 p-2 rounded-lg"><DollarSign className="w-4 h-4 text-green-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-white">{metrics.totalSold.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-purple-400" /> Top Creators</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.topByViews} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                <XAxis type="number" stroke="#9ca3af" />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /> Top Territories (Avg)</h3>
                    <div className="h-64">
                        {metrics.territoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.territoryData} layout="vertical" margin={{left: 20}}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151"/>
                                    <XAxis type="number" stroke="#9ca3af"/>
                                    <YAxis dataKey="country" type="category" stroke="#9ca3af" width={80}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}/>
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="%"/>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">No territory data uploaded.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Insights Section */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-32 h-32 text-purple-400" />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-white">AI Creator Insights</h2>
                    </div>
                    {!isAnalyzing && (
                        <button 
                            onClick={handleAnalyze} 
                            className="text-sm bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" /> {analysis ? 'Regenerate Analysis' : 'Generate Analysis'}
                        </button>
                    )}
                </div>

                {isAnalyzing ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <span className="ml-2 text-gray-400">Analyzing creator performance...</span>
                    </div>
                ) : analysis ? (
                    <div className="space-y-4 relative z-10">
                        <div className="bg-gray-800/50 p-4 rounded-lg"><p className="text-gray-300 text-sm leading-relaxed">{analysis.summary}</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-lg">
                                <h3 className="text-green-400 font-bold mb-2 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Top Performers</h3>
                                <ul className="space-y-1">{analysis.topPerformers.map((item, i) => <li key={i} className="text-xs text-gray-300">• {item}</li>)}</ul>
                            </div>
                            <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-lg">
                                <h3 className="text-purple-400 font-bold mb-2 text-sm flex items-center gap-2"><Brain className="w-4 h-4"/> Key Patterns</h3>
                                <ul className="space-y-1">{analysis.assumptions.map((item, i) => <li key={i} className="text-xs text-gray-300">• {item}</li>)}</ul>
                            </div>
                            <div className="bg-orange-900/10 border border-orange-500/20 p-4 rounded-lg">
                                <h3 className="text-orange-400 font-bold mb-2 text-sm flex items-center gap-2"><Target className="w-4 h-4"/> Opportunities</h3>
                                <ul className="space-y-1">{analysis.growthOpportunities.map((item, i) => <li key={i} className="text-xs text-gray-300">• {item}</li>)}</ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">Click "Generate Analysis" to get AI-powered insights for your creators.</div>
                )}
            </div>
        </div>
      ) : (
        // === MANAGEMENT TAB (Existing Content) ===
        <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="relative w-full xl:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search name, username, or niche..."
                    className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                    <TableIcon className="w-4 h-4" /> <span className="hidden sm:inline">Spreadsheet</span>
                    </button>
                    <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                    <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Grid</span>
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-700 mx-2 hidden xl:block"></div>
                
                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20">
                    <FileSpreadsheet className="w-4 h-4" /> Report
                </button>

                <button onClick={handleExportCSV} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    <FileText className="w-4 h-4" /> CSV
                </button>
                
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/20">
                    <Plus className="w-4 h-4" /> Add Creator
                </button>
                </div>
            </div>

            {/* Content Area */}
            {filteredCreators.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
                <p>No creators found. Add one to start syncing.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                {filteredCreators.map((creator) => (
                    <div key={creator.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-purple-500/50 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{creator.name}</h3>
                        {creator.username && (
                            <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                            <UserIcon className="w-3 h-3" /> @{creator.username}
                            </div>
                        )}
                        <div className="flex gap-2 mt-2">
                            <span className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                            {creator.niche}
                            </span>
                            <span className="inline-block bg-blue-900/50 text-blue-200 text-xs px-2 py-1 rounded border border-blue-500/20">
                            {creator.productCategory || 'Other'}
                            </span>
                        </div>
                        </div>
                        <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(creator)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteClick(creator.id, creator.name, e)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        {/* Uploads History Preview */}
                        {creator.uploads && creator.uploads.length > 0 ? (
                            <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span className="truncate max-w-[150px] font-medium text-white">
                                        {creator.uploads[creator.uploads.length-1].title || "Latest Video"}
                                    </span>
                                    <span className={`px-1.5 rounded-sm shrink-0 ${
                                    creator.uploads[creator.uploads.length-1].product === 'Maikalian' ? 'text-pink-300 bg-pink-900/20' : 
                                    creator.uploads[creator.uploads.length-1].product === 'Xmas Curtain' ? 'text-red-300 bg-red-900/20' : 
                                    'text-blue-300 bg-blue-900/20'
                                    }`}>
                                        {creator.uploads[creator.uploads.length-1].product}
                                    </span>
                                </div>
                                <a href={creator.uploads[creator.uploads.length-1].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline truncate">
                                    <PlayCircle className="w-3 h-3" /> Watch Video
                                </a>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                                <Video className="w-4 h-4" /> No uploads logged
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 py-4 border-t border-gray-700">
                        <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase mb-1">
                            <Video className="w-3 h-3" /> Total Views
                        </div>
                        <span className="text-white font-bold text-sm">{creator.avgViews.toLocaleString()}</span>
                        </div>
                        <div className="text-center border-l border-gray-700">
                        <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase mb-1">
                            <Heart className="w-3 h-3" /> Total Likes
                        </div>
                        <span className="text-white font-bold text-sm">{creator.avgLikes.toLocaleString()}</span>
                        </div>
                        <div className="text-center border-l border-gray-700">
                        <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase mb-1">
                            <Share2 className="w-3 h-3" /> Total Share
                        </div>
                        <span className="text-white font-bold text-sm">{creator.avgShares ? creator.avgShares.toLocaleString() : 0}</span>
                        </div>
                        <div className="text-center flex items-center justify-center">
                        <button 
                            onClick={() => openLibrary(creator)}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg shadow-lg shadow-blue-900/20 transition-all text-xs"
                            title="Manage Videos"
                        >
                            Manage
                        </button>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-fade-in shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900 text-gray-200 uppercase font-medium border-b border-gray-700">
                        <tr>
                        <th className="px-6 py-4">Creator</th>
                        <th className="px-6 py-4">Primary Niche</th>
                        <th className="px-6 py-4">Latest Upload</th>
                        <th className="px-6 py-4 text-right">Total Views</th>
                        <th className="px-6 py-4 text-right">Total Shares</th>
                        <th className="px-6 py-4 text-center">Video Library</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredCreators.map((creator) => {
                        const latestUpload = creator.uploads && creator.uploads.length > 0 
                            ? creator.uploads[creator.uploads.length - 1] 
                            : null;

                        return (
                        <tr key={creator.id} className="hover:bg-gray-750/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-medium text-white">{creator.name}</div>
                                <div className="text-gray-500 text-xs">@{creator.username}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded">{creator.productCategory}</span>
                            </td>
                            <td className="px-6 py-4">
                            {latestUpload ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-white font-medium text-xs">{latestUpload.title || "Untitled Video"}</span>
                                    <div className="flex gap-2 items-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border w-fit ${
                                        latestUpload.product === 'Maikalian' ? 'bg-pink-900/30 text-pink-300 border-pink-500/30' :
                                        latestUpload.product === 'Xmas Curtain' ? 'bg-red-900/30 text-red-300 border-red-500/30' :
                                        'bg-blue-900/30 text-blue-300 border-blue-500/30'
                                    }`}>
                                        {latestUpload.product}
                                    </span>
                                    <span className="text-[10px] text-gray-500">{new Date(latestUpload.dateAdded).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ) : <span className="text-gray-600 italic">No Uploads</span>}
                            </td>
                            <td className="px-6 py-4 text-right text-white font-mono">{creator.avgViews.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-white font-mono">{creator.avgShares ? creator.avgShares.toLocaleString() : 0}</td>
                            <td className="px-6 py-4 text-center">
                            <button 
                                onClick={() => openLibrary(creator)}
                                className="flex items-center justify-center mx-auto px-4 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold gap-2"
                                >
                                <Video className="w-3 h-3" />
                                Manage Videos ({creator.videosCount})
                                </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => handleOpenModal(creator)} className="text-gray-500 hover:text-purple-400"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={(e) => handleDeleteClick(creator.id, creator.name, e)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            </td>
                        </tr>
                        )})}
                    </tbody>
                    </table>
                </div>
                </div>
            )}
        </div>
      )}

      {/* VIDEO LIBRARY MODAL */}
      {libraryCreator && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-5xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
               {/* Header */}
               <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                         <PlayCircle className="w-5 h-5 text-blue-400" /> Video Library
                    </h3>
                    <p className="text-sm text-gray-400">Managing uploads for <span className="text-white font-medium">{libraryCreator.name}</span></p>
                  </div>
                  <button onClick={() => setLibraryCreator(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
               </div>

                {/* Inner Tabs */}
               <div className="flex border-b border-gray-700 bg-gray-900 px-6">
                  <button 
                    onClick={() => setActiveLibraryTab('videos')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeLibraryTab === 'videos' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    Video Library
                  </button>
                  <button 
                    onClick={() => setActiveLibraryTab('demographics')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeLibraryTab === 'demographics' ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    Demographics Import
                  </button>
               </div>
               
               <div className="overflow-y-auto flex-1 p-0 bg-gray-900">
                  
                  {activeLibraryTab === 'videos' && (
                    <>
                        <div className="p-4 flex justify-end bg-gray-800/50">
                            <button 
                                onClick={() => openVideoForm()} 
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Video
                            </button>
                        </div>
                        {/* Internal Form for Add/Edit */}
                        {isVideoFormOpen && (
                            <div className="p-6 bg-gray-800 border-b border-gray-700 animate-in slide-in-from-top-4">
                                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                    {editingVideoId ? <Edit2 className="w-4 h-4 text-purple-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                                    {editingVideoId ? 'Edit Video Details' : 'Log New Video'}
                                </h4>
                                <form onSubmit={saveVideo} className="space-y-4">
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Video Title */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase">Video Name / Title</label>
                                            <div className="relative">
                                                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                                <input 
                                                    required 
                                                    type="text" 
                                                    placeholder="e.g. Maikalian Shampoo Review v1" 
                                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={videoFormData.title}
                                                    onChange={e => setVideoFormData({...videoFormData, title: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        {/* Upload Date */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase">Upload Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                                <input 
                                                    required 
                                                    type="date" 
                                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none [color-scheme:dark]"
                                                    value={videoFormData.dateAdded}
                                                    onChange={e => setVideoFormData({...videoFormData, dateAdded: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-1 md:col-span-2 space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase">Video Link</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    required 
                                                    type="url" 
                                                    placeholder="https://tiktok.com/@user/video/..." 
                                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={videoFormData.url}
                                                    onChange={e => setVideoFormData({...videoFormData, url: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase">Brand / Category</label>
                                            <select 
                                                className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={videoFormData.product}
                                                onChange={e => setVideoFormData({...videoFormData, product: e.target.value})}
                                            >
                                                {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase">Specific Product Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Red Curtain 140cm"
                                                className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={videoFormData.productName || ''}
                                                onChange={e => setVideoFormData({...videoFormData, productName: e.target.value})}
                                            />
                                        </div>

                                        {/* Stats Inputs */}
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/50 p-4 rounded-lg">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Views</label>
                                                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.views} onChange={e => setVideoFormData({...videoFormData, views: Number(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Likes</label>
                                                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.likes} onChange={e => setVideoFormData({...videoFormData, likes: Number(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Comments</label>
                                                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.comments} onChange={e => setVideoFormData({...videoFormData, comments: Number(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Shares</label>
                                                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.shares} onChange={e => setVideoFormData({...videoFormData, shares: Number(e.target.value)})} />
                                            </div>
                                        </div>

                                        {/* Detailed Stats */}
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                                            <div className="col-span-2 md:col-span-4 text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-2">
                                                <DollarSign className="w-3 h-3"/> Sales & Engagement Details
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Followers +</label>
                                                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.newFollowers} onChange={e => setVideoFormData({...videoFormData, newFollowers: Number(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Avg Watch</label>
                                                <input type="text" placeholder="0:00" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.avgWatchTime} onChange={e => setVideoFormData({...videoFormData, avgWatchTime: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Watched %</label>
                                                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" value={videoFormData.watchedFullVideo} onChange={e => setVideoFormData({...videoFormData, watchedFullVideo: Number(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-green-500 uppercase">Items Sold</label>
                                                <input type="number" className="w-full bg-gray-800 border border-green-900/50 text-white p-2 rounded focus:border-green-500" value={videoFormData.itemsSold} onChange={e => setVideoFormData({...videoFormData, itemsSold: Number(e.target.value)})} />
                                            </div>
                                        </div>

                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button type="button" onClick={() => setIsVideoFormOpen(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
                                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg">Save Video</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* List */}
                        {(!libraryCreator.uploads || libraryCreator.uploads.length === 0) ? (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                <Video className="w-12 h-12 mb-3 opacity-20" />
                                <p>No videos logged yet. Click "Add Video" to start.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-800 text-gray-400 uppercase font-medium sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="px-6 py-3">Video Title</th>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3">Upload Date</th>
                                    <th className="px-6 py-3 text-right">Views</th>
                                    <th className="px-6 py-3 text-right">Sold</th>
                                    <th className="px-6 py-3">Link</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                {[...libraryCreator.uploads].reverse().map((upload) => (
                                    <tr key={upload.id} className="hover:bg-gray-800/50 bg-gray-900">
                                        <td className="px-6 py-3 font-medium text-white max-w-[200px] truncate">
                                            {upload.title || "Untitled Video"}
                                            {upload.productName && <div className="text-[10px] text-gray-500">{upload.productName}</div>}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`text-xs px-2 py-1 rounded border ${
                                            upload.product === 'Maikalian' ? 'bg-pink-900/10 text-pink-400 border-pink-500/20' :
                                            upload.product === 'Xmas Curtain' ? 'bg-red-900/10 text-red-400 border-red-500/20' :
                                            'bg-blue-900/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {upload.product}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-300">
                                            {upload.dateAdded ? new Date(upload.dateAdded).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-300 font-mono">{upload.views.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right font-mono text-green-400">{upload.itemsSold || '-'}</td>
                                        <td className="px-6 py-3">
                                            <a href={upload.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1 w-fit">
                                            Link <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </td>
                                        <td className="px-6 py-3 text-center flex items-center justify-center gap-3">
                                            <button onClick={() => openVideoForm(upload)} className="text-gray-500 hover:text-purple-400" title="Edit Video">
                                                <Edit2 className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={(e) => deleteVideo(upload.id, e)} 
                                                className="text-gray-500 hover:text-red-400" 
                                                title="Delete Video"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </>
                  )}

                  {/* === DEMOGRAPHICS TAB === */}
                  {activeLibraryTab === 'demographics' && (
                    <div className="p-6">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6">
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-400" /> Import Demographics Data
                            </h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Upload an Excel (.xlsx) file with audience data.
                                <br/><span className="text-xs text-gray-500">Supports sheets named: "Gender", "Territories", "History"</span>
                            </p>
                            
                            <label className="flex items-center justify-center gap-2 w-full p-8 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-green-500 hover:bg-gray-800/50 transition-all group">
                                <div className="text-center">
                                    <div className="bg-gray-700 group-hover:bg-green-500/20 p-3 rounded-full inline-block mb-2 transition-colors">
                                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-green-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-300 group-hover:text-white">Click to upload Excel File</p>
                                </div>
                                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
                            </label>
                        </div>

                        {/* Preview Charts if Data Exists */}
                        {libraryCreator.demographics ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-pink-400"/> Gender</h4>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={libraryCreator.demographics.gender} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                                    {libraryCreator.demographics.gender.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#3b82f6'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}/>
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400"/> Top Territories</h4>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={libraryCreator.demographics.territories} layout="vertical" margin={{left: 20}}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151"/>
                                                <XAxis type="number" stroke="#9ca3af"/>
                                                <YAxis dataKey="country" type="category" stroke="#9ca3af" width={80}/>
                                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}/>
                                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} name="%"/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {libraryCreator.demographics.history && (
                                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 md:col-span-2">
                                        <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-green-400"/> Follower Growth</h4>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={libraryCreator.demographics.history}>
                                                    <defs>
                                                        <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" stroke="#9ca3af" />
                                                    <YAxis stroke="#9ca3af"/>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}/>
                                                    <Area type="monotone" dataKey="followers" stroke="#10b981" fillOpacity={1} fill="url(#colorFollowers)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-12">No demographic data loaded yet.</div>
                        )}
                    </div>
                  )}
               </div>
           </div>
         </div>
      )}

      {/* Edit Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Creator Profile' : 'Add New Creator'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Full Name</label>
                  <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                 <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Username (@)</label>
                  <input required type="text" placeholder="tiktok_user" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Niche</label>
                  <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
                </div>
                 <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Primary Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <select 
                      className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none"
                      value={formData.productCategory}
                      onChange={e => setFormData({...formData, productCategory: e.target.value})}
                    >
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Email</label>
                  <input required type="email" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Phone</label>
                  <input required type="tel" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg shadow-purple-900/20 transition-all">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Creator?</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete <strong>{deleteName}</strong>? This action cannot be undone.</p>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => { setDeleteId(null); setDeleteName(null); }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-900/20 transition-all"
                >
                  Delete
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CreatorList;