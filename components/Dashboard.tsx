
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Legend, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell
} from 'recharts';
import { Loader2, Brain, TrendingUp, Users, RefreshCw, ShoppingBag, Filter, MessageCircle, Share2, BarChart2, Zap, User, ShieldAlert } from 'lucide-react';
import { Creator, AnalysisResult, ReportedVideo } from '../types';
import { analyzeCreatorData } from '../services/geminiService';

interface DashboardProps {
  creators: Creator[];
  reports: ReportedVideo[];
}

const PRODUCT_CATEGORIES = ['All Products', 'Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ creators, reports }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('All Products');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');

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

  // Re-run AI analysis when filter changes or data updates
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchAnalysis();
    }, 500); 
    return () => clearTimeout(timer);
  }, [creators, selectedProduct, selectedCreatorId]);

  // --- DATA AGGREGATION LOGIC ---

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

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
         });
     } else {
         // Fallback if no uploads log but basic stats exist
         if (selectedProduct === 'All Products' || c.productCategory === selectedProduct) {
             totalViews += c.avgViews;
             totalLikes += c.avgLikes;
             totalComments += c.avgComments;
             totalShares += (c.avgShares || 0);
         }
     }
  });

  // 2. Prepare Detailed Creator Data (For Global Charts)
  const globalCreatorData = filteredCreators.map(c => {
    let views = 0;
    let likes = 0;
    let comments = 0;
    let shares = 0;
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
      shares: v.shares || 0
  }));

  // 4. Category Comparison Data (Global Only)
  const categoryComparisonData = PRODUCT_CATEGORIES.filter(c => c !== 'All Products').map(cat => {
    let catTotalComments = 0;
    let catTotalLikes = 0;
    let videoCount = 0;

    creators.forEach(c => {
        if (c.uploads && c.uploads.length > 0) {
            const relevant = c.uploads.filter(u => u.product === cat);
            relevant.forEach(u => {
                catTotalComments += u.comments;
                catTotalLikes += u.likes;
                videoCount++;
            });
        } else if (c.productCategory === cat) {
            catTotalComments += c.avgComments;
            catTotalLikes += c.avgLikes;
            videoCount++;
        }
    });
    
    return {
      name: cat,
      avgComments: videoCount > 0 ? Math.round(catTotalComments / videoCount) : 0,
      avgLikes: videoCount > 0 ? Math.round(catTotalLikes / videoCount) : 0
    };
  });

  // 5. REPORT / VIOLATION ANALYTICS
  // Aggregating reports by type
  const violationTypeMap = new Map<string, number>();
  reports.forEach(r => {
    const current = violationTypeMap.get(r.violationType) || 0;
    violationTypeMap.set(r.violationType, current + 1);
  });
  const violationTypeData = Array.from(violationTypeMap.entries()).map(([name, value]) => ({ name, value }));

  // Aggregating reports by Creator (Top Violators)
  const creatorViolationMap = new Map<string, number>();
  reports.forEach(r => {
    const current = creatorViolationMap.get(r.creatorName) || 0;
    creatorViolationMap.set(r.creatorName, current + 1);
  });
  const topViolatorsData = Array.from(creatorViolationMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
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

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Views</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Likes</h3>
            <TrendingUp className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalLikes.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Comments</h3>
            <MessageCircle className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalComments.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Shares</h3>
            <Share2 className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalShares.toLocaleString()}</p>
        </div>
      </div>

      {/* CHARTS SECTION - CONDITIONAL */}
      {selectedCreatorId === 'all' ? (
        // === GLOBAL VIEW CHARTS ===
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        Category Engagement Comparison
                        </h3>
                        <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={categoryComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis yAxisId="left" stroke="#9ca3af" label={{ value: 'Likes', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" label={{ value: 'Comments', angle: 90, position: 'insideRight', fill: '#60a5fa' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="avgLikes" fill="#ec4899" name="Avg Likes" radius={[4, 4, 0, 0]} barSize={40} />
                            <Line yAxisId="right" type="monotone" dataKey="avgComments" stroke="#60a5fa" strokeWidth={3} name="Avg Comments" dot={{r: 4}} />
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
            <div className="space-y-6">
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
                                    <YAxis yAxisId="right" orientation="right" stroke="#ec4899" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="views" name="Total Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="likes" name="Total Likes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="shares" name="Total Shares" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </>
      ) : (
        // === SINGLE CREATOR VIEW CHARTS ===
        <div className="space-y-6">
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
                                <YAxis stroke="#9ca3af" />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                <Legend verticalAlign="top"/>
                                <Bar dataKey="views" name="Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="likes" name="Likes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="shares" name="Shares" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
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
      <div className="mt-8 space-y-6">
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
          {!loading && error && (
            <button onClick={fetchAnalysis} className="text-sm text-purple-400 hover:text-white flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Retry
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
          <p className="text-gray-400 py-4 text-center">Add creators to the database to generate AI insights.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
