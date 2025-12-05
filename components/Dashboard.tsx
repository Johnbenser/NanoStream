
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Line 
} from 'recharts';
import { Loader2, Brain, TrendingUp, Users, RefreshCw, ShoppingBag, Filter, MessageCircle } from 'lucide-react';
import { Creator, AnalysisResult } from '../types';
import { analyzeCreatorData } from '../services/geminiService';

interface DashboardProps {
  creators: Creator[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
const PRODUCT_COLORS = {
  'Maikalian': '#ec4899', // Pink for Shampoo/Beauty
  'Xmas Curtain': '#ef4444', // Red for Xmas
  'Tshirt': '#3b82f6', // Blue for Apparel
  'Other': '#9ca3af'
};

const PRODUCT_CATEGORIES = ['All Products', 'Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];

const Dashboard: React.FC<DashboardProps> = ({ creators }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('All Products');

  // Filter Creators based on selection
  const filteredCreators = selectedProduct === 'All Products'
    ? creators
    : creators.filter(c => (c.productCategory || 'Other') === selectedProduct);

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
    }, 500); // Debounce slightly to prevent rapid firing if user switches quickly
    return () => clearTimeout(timer);
  }, [creators, selectedProduct]);

  // --- DATA PROCESSING FOR CHARTS ---

  // 1. Top Performance Data (Dynamic based on filter)
  const performanceData = filteredCreators.map(c => ({
    name: c.username || c.name.split(' ')[0],
    views: c.avgViews,
    likes: c.avgLikes,
    comments: c.avgComments
  })).sort((a, b) => b.views - a.views).slice(0, 10);

  // 2. Product Distribution Data (For Pie Chart) - Only relevant when "All" is selected
  const productData = creators.reduce((acc, curr) => {
    const cat = curr.productCategory || 'Other';
    const existing = acc.find(item => item.name === cat);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: cat, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // 3. Category Comparison Data (For Comments/Engagement Graph)
  // This aggregates data to compare Maikalian vs Tshirt vs Curtain
  const categoryComparisonData = PRODUCT_CATEGORIES.filter(c => c !== 'All Products').map(cat => {
    const catCreators = creators.filter(c => (c.productCategory || 'Other') === cat);
    const count = catCreators.length;
    if (count === 0) return { name: cat, avgComments: 0, avgLikes: 0 };
    
    const totalComments = catCreators.reduce((sum, c) => sum + c.avgComments, 0);
    const totalLikes = catCreators.reduce((sum, c) => sum + c.avgLikes, 0);
    
    return {
      name: cat,
      avgComments: Math.round(totalComments / count),
      avgLikes: Math.round(totalLikes / count)
    };
  });

  // Totals for metrics cards
  const totalViews = filteredCreators.reduce((sum, c) => sum + c.avgViews, 0);
  const totalLikes = filteredCreators.reduce((sum, c) => sum + c.avgLikes, 0);
  const totalComments = filteredCreators.reduce((sum, c) => sum + c.avgComments, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div>
           <h2 className="text-xl font-bold text-white">
             {selectedProduct === 'All Products' ? 'Global Overview' : `${selectedProduct} Performance`}
           </h2>
           <p className="text-gray-400 text-sm">
             {selectedProduct === 'All Products' 
               ? 'Showing data for all product lines.' 
               : `Analyzing ${filteredCreators.length} videos specifically for ${selectedProduct}.`}
           </p>
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
          <select 
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-gray-900 border border-purple-500/30 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none cursor-pointer min-w-[200px]"
          >
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Views</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Likes</h3>
            <TrendingUp className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalLikes.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Comments</h3>
            <MessageCircle className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalComments.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Top Creators (Filtered) */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Top Creator Performance ({selectedProduct})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  cursor={{fill: '#374151'}}
                />
                <Bar dataKey="views" fill="#3b82f6" name="Views" radius={[4, 4, 0, 0]} />
                <Bar dataKey="likes" fill="#ec4899" name="Likes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Context Sensitive Chart */}
        {selectedProduct === 'All Products' ? (
           // IF ALL: Show Comparison of Products (Comments vs Likes)
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
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                   />
                   <Legend />
                   <Bar yAxisId="left" dataKey="avgLikes" fill="#ec4899" name="Avg Likes" radius={[4, 4, 0, 0]} barSize={40} />
                   <Line yAxisId="right" type="monotone" dataKey="avgComments" stroke="#60a5fa" strokeWidth={3} name="Avg Comments" dot={{r: 4}} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
             <p className="text-xs text-gray-400 mt-2 text-center">Comparing average engagement metrics across product lines.</p>
           </div>
        ) : (
           // IF SPECIFIC PRODUCT: Show Comment Breakdown for specific creators
           <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-400" />
                Most Discussed {selectedProduct} Videos
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                    />
                    <Bar dataKey="comments" fill="#60a5fa" name="Comments" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        )}
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain className="w-32 h-32" />
        </div>
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">
               {selectedProduct === 'All Products' ? 'Global AI Insights' : `${selectedProduct} AI Insights`}
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
            <span className="ml-2 text-gray-400">Analyzing {selectedProduct} data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
            <p className="text-red-400 font-medium mb-1">Analysis Failed</p>
            <p className="text-gray-400 text-sm mb-3">{error}</p>
            {error.includes("Key") && (
              <div className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 p-3 rounded border border-yellow-400/20">
                <p className="font-bold mb-1">Vercel Configuration Required:</p>
                <p>1. Go to Vercel Settings → Environment Variables.</p>
                <p>2. Add Key: <code>VITE_GEMINI_API_KEY</code></p>
                <p>3. Paste your Gemini API Key.</p>
                <p>4. Redeploy the app.</p>
              </div>
            )}
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
                   {selectedProduct === 'All Products' ? 'General Demographics' : `${selectedProduct} Audience`}
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
