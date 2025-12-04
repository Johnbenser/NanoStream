import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Loader2, Brain, TrendingUp, Users } from 'lucide-react';
import { Creator, AnalysisResult } from '../types';
import { analyzeCreatorData } from '../services/geminiService';

interface DashboardProps {
  creators: Creator[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

const Dashboard: React.FC<DashboardProps> = ({ creators }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (creators.length === 0) return;
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeCreatorData(creators);
        setAnalysis(result);
      } catch (err) {
        setError("Failed to generate AI analysis.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [creators]);

  const nicheData = creators.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.niche);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: curr.niche, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const performanceData = creators.map(c => ({
    name: c.name.split(' ')[0], // First name for chart
    views: c.avgViews,
    likes: c.avgLikes
  })).sort((a, b) => b.views - a.views).slice(0, 10);

  const totalViews = creators.reduce((sum, c) => sum + c.avgViews, 0);
  const totalLikes = creators.reduce((sum, c) => sum + c.avgLikes, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Tracked Views</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Tracked Likes</h3>
            <TrendingUp className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalLikes.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Active Creators</h3>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{creators.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Top Creator Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                />
                <Bar dataKey="views" fill="#3b82f6" name="Avg Views" radius={[4, 4, 0, 0]} />
                <Bar dataKey="likes" fill="#ec4899" name="Avg Likes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Niche Distribution */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Niche Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nicheData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {nicheData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain className="w-32 h-32" />
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Gemini Data Insights</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="ml-2 text-gray-400">Analyzing performance data...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 py-4">{error}</div>
        ) : analysis ? (
          <div className="space-y-4 relative z-10">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-purple-300 font-semibold mb-2">Summary</h3>
              <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>
        ) : (
          <p className="text-gray-400">No data available for analysis.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
