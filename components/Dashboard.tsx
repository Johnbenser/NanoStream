import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Legend, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Loader2, Brain, TrendingUp, Users, RefreshCw, ShoppingBag, Filter, MessageCircle, Share2, BarChart2, Zap, User, ShieldAlert, Video, Plus, Search, Calendar, ExternalLink, X, DollarSign, Clock, Eye, Activity, Heart, Globe } from 'lucide-react';
import { Creator, AnalysisResult, ReportedVideo, VideoUpload } from '../types';
import { analyzeCreatorData } from '../services/geminiService';
import { saveCreator } from '../services/storageService';

interface DashboardProps {
  creators: Creator[];
  reports: ReportedVideo[];
}

const PRODUCT_CATEGORIES = ['All Products', 'Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ creators, reports }) => {
  const [viewMode, setViewMode] = useState<'analytics' | 'log'>('analytics');
  
  // Analytics State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('All Products');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');

  // Video Log State
  const [logSearch, setLogSearch] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState<Partial<VideoUpload> & { creatorId: string }>({
    creatorId: '',
    title: '',
    url: '',
    product: 'Maikalian',
    productName: '',
    views: 0, likes: 0, comments: 0, shares: 0,
    newFollowers: 0, avgWatchTime: '', watchedFullVideo: 0, itemsSold: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });

  // Filter Creators/Videos based on selection
  const filteredCreators = creators.filter(c => {
    // 1. Filter by Creator Selection
    if (selectedCreatorId !== 'all' && c.id !== selectedCreatorId) {
      return false;
    }

    // 2. Filter by Product Selection (Check if they have relevant uploads or matching category)
    if (selectedProduct === 'All Products') return true;

    if (c.uploads && c.uploads.length > 0) {
        return c.uploads.some(u => u.product === selectedProduct);
    }
    return (c.productCategory || 'Other') === selectedProduct;
  });

  const fetchAnalysis = async () => {
    if (filteredCreators.length === 0) {
      setAnalysis(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeCreatorData(filteredCreators);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI analysis.");
    } finally {
      setLoading(false);
    }
  };

  // Reset analysis when data changes, but DO NOT auto-generate
  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [creators, selectedProduct, selectedCreatorId]);

  // --- DATA AGGREGATION LOGIC ---

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalItemsSold = 0;
  
  // Watch Time Calculation Variables
  let totalWatchSeconds = 0;
  let videosWithWatchTimeCount = 0;

  // Helper to parse time string (e.g. "0:15" or "15s") to seconds
  const parseWatchTime = (timeStr?: string): number => {
    if (!timeStr) return 0;
    try {
        // Handle "MM:SS" format
        if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            const min = parseInt(parts[0], 10) || 0;
            const sec = parseInt(parts[1], 10) || 0;
            return (min * 60) + sec;
        }
        // Handle "15s" or raw number
        const num = parseInt(timeStr.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    } catch (e) {
        return 0;
    }
  };

  // Helper to format seconds back to MM:SS
  const formatSeconds = (totalSeconds: number): string => {
    if (totalSeconds === 0) return "0:00";
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Calculate Totals based on filtered list
  filteredCreators.forEach(c => {
     if (c.uploads && c.uploads.length > 0) {
         const relevantUploads = selectedProduct === 'All Products'
            ? c.uploads 
            : c.uploads.filter(u => u.product === selectedProduct);
            
         relevantUploads.forEach(u => {
             totalViews += u.views;
             totalLikes += u.likes;
             totalComments += u.comments;
             totalShares += (u.shares || 0);
             totalItemsSold += (u.itemsSold || 0);

             if (u.avgWatchTime) {
                 const secs = parseWatchTime(u.avgWatchTime);
                 if (secs > 0) {
                     totalWatchSeconds += secs;
                     videosWithWatchTimeCount++;
                 }
             }
         });
     } else {
         // Fallback if no uploads log but basic stats exist
         if (selectedProduct === 'All Products' || c.productCategory === selectedProduct) {
             totalViews += c.avgViews;
             totalLikes += c.avgLikes;
             totalComments += c.avgComments;
             totalShares += (c.avgShares || 0);
             // Cannot deduce sold items or watch time from basic creator stats
         }
     }
  });

  // Demographics Aggregation (From filtered creators)
  let genderAgg: Record<string, number> = { Female: 0, Male: 0 };
  let territoryAgg: Record<string, number> = {};
  let demoCount = 0;

  filteredCreators.forEach(c => {
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


  const totalEngagement = totalLikes + totalComments + totalShares;
  const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : "0.00";
  const averageWatchTimeDisplay = videosWithWatchTimeCount > 0 
      ? formatSeconds(totalWatchSeconds / videosWithWatchTimeCount) 
      : "0:00";

  // 2. Prepare Detailed Creator Data (For Global Charts)
  const globalCreatorData = filteredCreators.map(c => {
    let views = 0;
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let itemsSold = 0;
    let count = 0;

    if (c.uploads && c.uploads.length > 0) {
        const relevantUploads = selectedProduct === 'All Products' 
            ? c.uploads 
            : c.uploads.filter(u => u.product === selectedProduct);
        
        relevantUploads.forEach(u => {
            views += u.views;
            likes += u.likes;
            comments += u.comments;
            shares += (u.shares || 0);
            itemsSold += (u.itemsSold || 0);
            count++;
        });
    } else if (selectedProduct === 'All Products' || c.productCategory === selectedProduct) {
        views = c.avgViews;
        likes = c.avgLikes;
        comments = c.avgComments;
        shares = c.avgShares || 0;
        count = c.videosCount || 1;
    }

    if (views === 0 && count === 0) return null;

    return {
        name: c.username || c.name.split(' ')[0], 
        fullName: c.name,
        views: views,
        likes: likes,
        shares: shares,
        itemsSold: itemsSold,
        engagement: likes + comments + shares,
        engagementRate: views > 0 ? parseFloat(((likes + comments + shares) / views * 100).toFixed(2)) : 0
    };
  }).filter(item => item !== null);

  const sortedByViews = [...globalCreatorData].sort((a, b) => b!.views - a!.views);

  // 3. Prepare Single Creator Video Data (If one creator selected)
  const singleCreator = selectedCreatorId !== 'all' ? filteredCreators[0] : null;
  const singleCreatorVideos = singleCreator?.uploads 
    ? (selectedProduct === 'All Products' ? singleCreator.uploads : singleCreator.uploads.filter(u => u.product === selectedProduct))
    : [];

  const videoChartData = singleCreatorVideos.map(v => ({
      name: v.title || 'Untitled',
      product: v.product,
      views: v.views,
      likes: v.likes,
      shares: v.shares || 0,
      sold: v.itemsSold || 0
  }));

  // 4. Category Comparison Data (Global Only)
  const categoryComparisonData = PRODUCT_CATEGORIES.filter(c => c !== 'All Products').map(cat => {
    let catTotalComments = 0;
    let catTotalLikes = 0;
    let catTotalSold = 0;
    let videoCount = 0;

    creators.forEach(c => {
        if (c.uploads && c.uploads.length > 0) {
            const relevant = c.uploads.filter(u => u.product === cat);
            relevant.forEach(u => {
                catTotalComments += u.comments;
                catTotalLikes += u.likes;
                catTotalSold += (u.itemsSold || 0);
                videoCount++;
            });
        }
    });
    
    return {
      name: cat,
      avgComments: videoCount > 0 ? Math.round(catTotalComments / videoCount) : 0,
      avgLikes: videoCount > 0 ? Math.round(catTotalLikes / videoCount) : 0,
      totalSold: catTotalSold
    };
  });

  // 5. REPORT / VIOLATION ANALYTICS
  const violationTypeMap = new Map<string, number>();
  reports.forEach(r => {
    const current = violationTypeMap.get(r.violationType) || 0;
    violationTypeMap.set(r.violationType, current + 1);
  });
  const violationTypeData = Array.from(violationTypeMap.entries()).map(([name, value]) => ({ name, value }));

  const creatorViolationMap = new Map<string, number>();
  reports.forEach(r => {
    const current = creatorViolationMap.get(r.creatorName) || 0;
    creatorViolationMap.set(r.creatorName, current + 1);
  });
  const topViolatorsData = Array.from(creatorViolationMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // --- VIDEO LOG LOGIC ---
  const allUploads = useMemo(() => {
    return creators.flatMap(c => (c.uploads || []).map(u => ({
        ...u,
        creatorName: c.name,
        creatorUsername: c.username,
        creatorId: c.id
    }))).sort((a, b) => new Date(b.dateAdded || Date.now()).getTime() - new Date(a.dateAdded || Date.now()).getTime());
  }, [creators]);

  const filteredUploads = allUploads.filter(u => 
      u.title.toLowerCase().includes(logSearch.toLowerCase()) || 
      u.creatorName.toLowerCase().includes(logSearch.toLowerCase()) ||
      u.product.toLowerCase().includes(logSearch.toLowerCase()) ||
      (u.productName && u.productName.toLowerCase().includes(logSearch.toLowerCase()))
  );

  const handleQuickLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!logForm.creatorId) return;

      const creator = creators.find(c => c.id === logForm.creatorId);
      if (!creator) return;

      const newVideo: VideoUpload = {
        id: Date.now().toString(),
        title: logForm.title || '',
        url: logForm.url || '',
        product: logForm.product || 'Maikalian',
        productName: logForm.productName,
        dateAdded: logForm.dateAdded || new Date().toISOString(),
        views: logForm.views || 0,
        likes: logForm.likes || 0,
        comments: logForm.comments || 0,
        shares: logForm.shares || 0,
        newFollowers: logForm.newFollowers,
        avgWatchTime: logForm.avgWatchTime,
        watchedFullVideo: logForm.watchedFullVideo,
        itemsSold: logForm.itemsSold
      };

      const updatedUploads = [...(creator.uploads || []), newVideo];
      
      const tViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
      const tLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
      const tComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
      const tShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

      const updatedCreator = {
          ...creator,
          videoLink: newVideo.url,
          uploads: updatedUploads,
          avgViews: tViews,
          avgLikes: tLikes,
          avgComments: tComments,
          avgShares: tShares,
          videosCount: updatedUploads.length,
          lastUpdated: new Date().toISOString()
      };

      const formData = {
        name: updatedCreator.name,
        username: updatedCreator.username,
        niche: updatedCreator.niche,
        productCategory: updatedCreator.productCategory,
        email: updatedCreator.email,
        phone: updatedCreator.phone,
        videoLink: updatedCreator.videoLink,
        uploads: updatedCreator.uploads,
        avgViews: updatedCreator.avgViews,
        avgLikes: updatedCreator.avgLikes,
        avgComments: updatedCreator.avgComments,
        avgShares: updatedCreator.avgShares,
        videosCount: updatedCreator.videosCount
      };

      await saveCreator(formData, creator.id);
      setIsLogModalOpen(false);
      setLogForm({ 
        creatorId: '', title: '', url: '', product: 'Maikalian', productName: '',
        views: 0, likes: 0, comments: 0, shares: 0, newFollowers: 0, avgWatchTime: '', watchedFullVideo: 0, itemsSold: 0,
        dateAdded: new Date().toISOString().split('T')[0]
      });
  };


  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* NAVIGATION TABS */}
      <div className="flex border-b border-gray-700 mb-6 space-x-6">
        <button 
           onClick={() => setViewMode('analytics')}
           className={`pb-4 px-2 text-sm font-bold transition-colors relative ${viewMode === 'analytics' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
            Analytics Overview
            {viewMode === 'analytics' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
        </button>
        <button 
           onClick={() => setViewMode('log')}
           className={`pb-4 px-2 text-sm font-bold transition-colors relative ${viewMode === 'log' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
        >
            Video Upload Log
            {viewMode === 'log' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
        </button>
      </div>

      {viewMode === 'log' ? (
        // === VIDEO UPLOAD LOG VIEW ===
        <div className="space-y-6">
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Video className="w-6 h-6 text-blue-400" />
                        AI Video Records
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Input video performance, items sold, and advanced engagement metrics.
                    </p>
                </div>
                <button 
                    onClick={() => setIsLogModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <Plus className="w-4 h-4" /> Quick Record Video
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Search by video title, creator, or product name..."
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
                           <tr>
                               <th className="px-6 py-4">Date</th>
                               <th className="px-6 py-4">Creator</th>
                               <th className="px-6 py-4">Video Info</th>
                               <th className="px-6 py-4">Product / Item</th>
                               <th className="px-6 py-4 text-right">Views</th>
                               <th className="px-6 py-4 text-right">Sold</th>
                               <th className="px-6 py-4 text-center">Watch %</th>
                               <th className="px-6 py-4 text-center">Link</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-700">
                           {filteredUploads.length === 0 ? (
                               <tr>
                                   <td colSpan={8} className="px-6 py-8 text-center text-gray-500 italic">
                                       No videos found. Use "Quick Record" to add one.
                                   </td>
                               </tr>
                           ) : (
                               filteredUploads.map((video, idx) => (
                                   <tr key={idx} className="hover:bg-gray-750/50 transition-colors">
                                       <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                                           {video.dateAdded ? new Date(video.dateAdded).toLocaleDateString() : '-'}
                                       </td>
                                       <td className="px-6 py-4">
                                           <div className="font-medium text-white">{video.creatorName}</div>
                                           <div className="text-xs text-gray-500">@{video.creatorUsername}</div>
                                       </td>
                                       <td className="px-6 py-4">
                                            <div className="text-white font-medium truncate max-w-[150px]">{video.title || "Untitled"}</div>
                                            {video.avgWatchTime && <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {video.avgWatchTime}</div>}
                                       </td>
                                       <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border w-fit ${
                                                    video.product === 'Maikalian' ? 'bg-pink-900/20 text-pink-300 border-pink-500/20' : 
                                                    video.product === 'Xmas Curtain' ? 'bg-red-900/20 text-red-300 border-red-500/20' : 
                                                    'bg-blue-900/20 text-blue-300 border-blue-500/20'
                                                }`}>
                                                    {video.product}
                                                </span>
                                                {video.productName && <span className="text-xs text-gray-300">{video.productName}</span>}
                                            </div>
                                       </td>
                                       <td className="px-6 py-4 text-right text-gray-300 font-mono">
                                           {video.views > 0 ? video.views.toLocaleString() : '-'}
                                       </td>
                                       <td className="px-6 py-4 text-right font-mono">
                                            {video.itemsSold ? (
                                                <span className="text-green-400 font-bold">{video.itemsSold}</span>
                                            ) : <span className="text-gray-600">-</span>}
                                       </td>
                                       <td className="px-6 py-4 text-center font-mono text-gray-400">
                                            {video.watchedFullVideo ? `${video.watchedFullVideo}%` : '-'}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                           {video.url && (
                                               <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors">
                                                   <ExternalLink className="w-4 h-4" />
                                               </a>
                                           )}
                                       </td>
                                   </tr>
                               ))
                           )}
                       </tbody>
                   </table>
               </div>
            </div>
        </div>
      ) : (
        // === ANALYTICS OVERVIEW VIEW ===
        <>
            {/* HEADER & FILTER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
                <div>
                <h2 className="text-xl font-bold text-white">
                    {selectedCreatorId !== 'all' 
                        ? `${singleCreator?.name}'s Analytics` 
                        : (selectedProduct === 'All Products' ? 'Global Overview' : `${selectedProduct} Performance`)}
                </h2>
                <p className="text-gray-400 text-sm">
                    {selectedCreatorId !== 'all' 
                    ? `Detailed video performance analysis for ${singleCreator?.name}.`
                    : (selectedProduct === 'All Products' 
                        ? 'Showing aggregated data across all campaigns.' 
                        : `Analyzing specific video performance for ${selectedProduct}.`)}
                </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                {/* CREATOR SELECTOR */}
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                    <select 
                        value={selectedCreatorId}
                        onChange={(e) => setSelectedCreatorId(e.target.value)}
                        className="w-full sm:w-auto bg-gray-900 border border-blue-500/30 text-white pl-10 pr-8 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
                    >
                    <option value="all">All Creators</option>
                    {creators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    </select>
                </div>

                {/* PRODUCT SELECTOR */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                    <select 
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full sm:w-auto bg-gray-900 border border-purple-500/30 text-white pl-10 pr-8 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none cursor-pointer"
                    >
                    {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    </select>
                </div>
                </div>
            </div>

            {/* KEY METRICS GRID - UPDATED */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Views */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Eye className="w-16 h-16 text-blue-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wide">Total Views</h3>
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Eye className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white relative z-10">{totalViews.toLocaleString()}</p>
                </div>

                {/* 2. Engagement Rate */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-16 h-16 text-purple-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wide">Engagement Rate</h3>
                        <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white relative z-10">{engagementRate}%</p>
                </div>

                {/* 3. Items Sold */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-16 h-16 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wide">Items Sold</h3>
                         <div className="bg-green-500/20 p-2 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white relative z-10">{totalItemsSold.toLocaleString()}</p>
                </div>

                {/* 4. Average Watch Time */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-16 h-16 text-orange-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wide">Avg. Watch Time</h3>
                         <div className="bg-orange-500/20 p-2 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white relative z-10">{averageWatchTimeDisplay}</p>
                </div>
            </div>

            {/* DEMOGRAPHICS CHARTS (Aggregated) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-pink-400" /> Audience Gender (Average)
                    </h3>
                    <div className="h-64">
                        {genderData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genderData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {genderData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                No demographics data uploaded by creators.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" /> Top Territories (Avg %)
                    </h3>
                    <div className="h-64">
                        {territoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={territoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                    <XAxis type="number" stroke="#9ca3af" unit="%" />
                                    <YAxis dataKey="country" type="category" stroke="#9ca3af" width={100} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                No territory data uploaded.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CHARTS SECTION - CONDITIONAL */}
            {selectedCreatorId === 'all' ? (
                // === GLOBAL VIEW CHARTS ===
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* CHART 1: Top Creators */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Top 10 Performers (Total Views)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sortedByViews.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                cursor={{fill: '#374151'}}
                                />
                                <Bar dataKey="views" fill="#3b82f6" name="Total Views" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="likes" fill="#ec4899" name="Total Likes" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                        </div>

                        {/* CHART 2: Comparison */}
                        {selectedProduct === 'All Products' ? (
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-yellow-400" />
                                Category Sales & Interactions
                                </h3>
                                <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={categoryComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis yAxisId="left" stroke="#9ca3af" label={{ value: 'Interactions', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#22c55e" label={{ value: 'Sold', angle: 90, position: 'insideRight', fill: '#22c55e' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="avgLikes" fill="#ec4899" name="Avg Likes" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Line yAxisId="right" type="monotone" dataKey="totalSold" stroke="#22c55e" strokeWidth={3} name="Total Sold" dot={{r: 4}} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-blue-400" />
                                    Most Discussed {selectedProduct} Videos
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sortedByViews.slice(0, 10)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                        <XAxis type="number" stroke="#9ca3af" />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                        <Bar dataKey="engagement" fill="#60a5fa" name="Total Interactions" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DETAILED GLOBAL ANALYTICS */}
                    <div className="space-y-6 mb-6">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <BarChart2 className="w-6 h-6 text-purple-400" />
                            <h2 className="text-xl font-bold text-white">Advanced Analytics</h2>
                        </div>

                        {/* SCATTER PLOT */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" /> Engagement Efficiency Matrix
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis type="number" dataKey="views" name="Total Views" stroke="#9ca3af" label={{ value: 'Views', position: 'insideBottomRight', offset: -10, fill: '#9ca3af' }} />
                                        <YAxis type="number" dataKey="engagement" name="Total Interactions" stroke="#9ca3af" label={{ value: 'Interactions', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                                        <ZAxis type="number" dataKey="engagementRate" range={[50, 400]} name="Eng. Rate %" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                        <Scatter name="Creators" data={sortedByViews} fill="#8884d8">
                                            {sortedByViews.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.engagementRate > 5 ? '#4ade80' : '#a855f7'} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* SCROLLABLE LEADERBOARD */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">Comprehensive Leaderboard</h3>
                            <div className="overflow-x-auto pb-4">
                                <div style={{ width: `${Math.max(100, sortedByViews.length * 80)}%`, minWidth: '1000px', height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={sortedByViews} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="name" stroke="#9ca3af" interval={0} angle={-45} textAnchor="end" height={60} />
                                            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                            <Legend />
                                            <Bar yAxisId="left" dataKey="views" name="Total Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar yAxisId="right" dataKey="itemsSold" name="Items Sold" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // === SINGLE CREATOR VIEW CHARTS ===
                <div className="space-y-6 mb-6">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-400" />
                            Video Performance Analysis: {singleCreator?.name}
                        </h3>
                        {videoChartData.length > 0 ? (
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={videoChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" interval={0} />
                                        <YAxis yAxisId="left" stroke="#9ca3af" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                        <Legend verticalAlign="top"/>
                                        <Bar yAxisId="left" dataKey="views" name="Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar yAxisId="left" dataKey="likes" name="Likes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                        <Bar yAxisId="right" dataKey="sold" name="Items Sold" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500 bg-gray-900/50 rounded-lg border border-gray-700 border-dashed">
                                <BarChart2 className="w-10 h-10 mb-2 opacity-50" />
                                <p>No individual video data available.</p>
                                <p className="text-xs mt-1">Go to Creator Database {'>'} Manage Videos to add data.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === VIOLATION ANALYTICS SECTION === */}
            <div className="mt-8 space-y-6 mb-8">
                <div className="flex items-center gap-2 px-1">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                    <h2 className="text-xl font-bold text-white">Violation Analytics</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart: Violations by Type */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Reports by Violation Type</h3>
                        <div className="h-64">
                            {violationTypeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={violationTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {violationTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    No reports data available.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bar Chart: Violations by Creator */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Top 5 Reported Creators</h3>
                        <div className="h-64">
                            {topViolatorsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topViolatorsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false}/>
                                        <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                                        <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                        <Bar dataKey="count" name="Violations" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    No creators reported yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Analysis Section (Dynamic based on filter) */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden mt-8">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain className="w-32 h-32" />
                </div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-bold text-white">
                    {selectedCreatorId !== 'all' ? `AI Insights: ${singleCreator?.name}` : 'Global AI Insights'}
                    </h2>
                </div>
                
                {/* Generation Control - Manual Button */}
                {!loading && (
                    <button 
                        onClick={fetchAnalysis} 
                        className="text-sm bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                    >
                    <RefreshCw className="w-4 h-4" /> {analysis ? 'Regenerate Analysis' : 'Generate Analysis'}
                    </button>
                )}
                </div>

                {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <span className="ml-2 text-gray-400">Analyzing data...</span>
                </div>
                ) : error ? (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                    <p className="text-red-400 font-medium mb-1">Analysis Failed</p>
                    <p className="text-gray-400 text-sm mb-3">{error}</p>
                </div>
                ) : analysis ? (
                <div className="space-y-4 relative z-10">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-purple-300 font-semibold mb-2">Summary</h3>
                    <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <h3 className="text-blue-300 font-semibold mb-2">Key Assumptions</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {analysis.assumptions?.map((item, idx) => (
                            <li key={idx} className="text-sm">{item}</li>
                        )) || <li className="text-sm text-gray-500">No assumptions available</li>}
                        </ul>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <h3 className="text-green-300 font-semibold mb-2">Growth Opportunities</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {analysis.growthOpportunities?.map((item, idx) => (
                            <li key={idx} className="text-sm">{item}</li>
                        )) || <li className="text-sm text-gray-500">No opportunities available</li>}
                        </ul>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-pink-500/20">
                        <h3 className="text-pink-300 font-semibold mb-2">
                        Audience Demographics
                        </h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {analysis.audienceDemographics?.map((item, idx) => (
                            <li key={idx} className="text-sm">{item}</li>
                        )) || <li className="text-sm text-gray-500">No data available</li>}
                        </ul>
                    </div>
                    </div>
                </div>
                ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-800/20 rounded-lg border border-gray-700/50 border-dashed">
                    <p>Click "Generate Analysis" to get AI-powered insights for this view.</p>
                </div>
                )}
            </div>
        </>
      )}

      {/* QUICK LOG MODAL */}
      {isLogModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="p-5 border-b border-gray-700 flex justify-between items-center">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <Plus className="w-5 h-5 text-green-400"/> Quick Record Video
               </h2>
               <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
             </div>
             <form onSubmit={handleQuickLog} className="p-6 space-y-4">
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase">Creator</label>
                     <select 
                       required
                       className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                       value={logForm.creatorId}
                       onChange={e => setLogForm({...logForm, creatorId: e.target.value})}
                     >
                       <option value="">Select a creator...</option>
                       {creators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                     <input 
                       required
                       type="date"
                       className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                       value={logForm.dateAdded}
                       onChange={e => setLogForm({...logForm, dateAdded: e.target.value})}
                     />
                   </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase">Video Title</label>
                 <input 
                   required
                   type="text"
                   className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="e.g. Unboxing Video 1"
                   value={logForm.title}
                   onChange={e => setLogForm({...logForm, title: e.target.value})}
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Category / Brand</label>
                    <select 
                        className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={logForm.product}
                        onChange={e => setLogForm({...logForm, product: e.target.value})}
                    >
                        {PRODUCT_CATEGORIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Specific Product Name</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Red Velvet 140cm"
                      value={logForm.productName}
                      onChange={e => setLogForm({...logForm, productName: e.target.value})}
                    />
                  </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase">Video URL</label>
                 <input 
                   type="url"
                   className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="https://tiktok.com/..."
                   value={logForm.url}
                   onChange={e => setLogForm({...logForm, url: e.target.value})}
                 />
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Views</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.views} onChange={e => setLogForm({...logForm, views: Number(e.target.value)})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Likes</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.likes} onChange={e => setLogForm({...logForm, likes: Number(e.target.value)})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Comments</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.comments} onChange={e => setLogForm({...logForm, comments: Number(e.target.value)})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Shares</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.shares} onChange={e => setLogForm({...logForm, shares: Number(e.target.value)})}/>
                    </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                    <div className="col-span-2 md:col-span-4 text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-2">
                        <DollarSign className="w-3 h-3"/> Sales & Deep Analytics
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">New Followers</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.newFollowers} onChange={e => setLogForm({...logForm, newFollowers: Number(e.target.value)})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Watch Time</label>
                        <input type="text" placeholder="e.g. 0:15" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.avgWatchTime} onChange={e => setLogForm({...logForm, avgWatchTime: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Watched Full %</label>
                        <input type="number" placeholder="%" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={logForm.watchedFullVideo} onChange={e => setLogForm({...logForm, watchedFullVideo: Number(e.target.value)})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-green-500 uppercase">Items Sold</label>
                        <input type="number" className="w-full bg-gray-800 border border-green-900/50 text-white p-2 rounded focus:outline-none focus:border-green-500" value={logForm.itemsSold} onChange={e => setLogForm({...logForm, itemsSold: Number(e.target.value)})}/>
                    </div>
               </div>

               <div className="pt-2">
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-900/20">
                    Record Upload
                 </button>
               </div>
             </form>
           </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;