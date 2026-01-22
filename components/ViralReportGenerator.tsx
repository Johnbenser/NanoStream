import React, { useState } from 'react';
import { Flame, Brain, Share2, MessageCircle, Heart, Bookmark, Eye, FileSpreadsheet, Sparkles, Target, Zap, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { analyzeViralVideo } from '../services/geminiService';
import { ViralReportResult } from '../types';

const ViralReportGenerator: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    platform: 'TikTok',
    niche: '',
    product: '',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0
  });

  const [analysis, setAnalysis] = useState<ViralReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.views) {
        alert("Please enter metrics to analyze.");
        return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
        const result = await analyzeViralVideo(formData);
        setAnalysis(result);
    } catch (e: any) {
        alert("Analysis failed: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analysis) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const engagementRate = ((formData.likes + formData.comments + formData.shares + formData.saves) / formData.views * 100).toFixed(2);

    const htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; color: #111; }
          .header { background: #000; color: #fff; padding: 30px; text-align: center; border-bottom: 5px solid #ef4444; }
          .title { font-size: 32px; font-weight: 900; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 14px; color: #aaa; margin-top: 10px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
          .metric-box { background: #fff; border: 1px solid #e5e7eb; padding: 15px; text-align: center; border-radius: 8px; }
          .metric-val { font-size: 24px; font-weight: bold; color: #111; font-family: monospace; }
          .metric-label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-top: 5px; }
          .section { padding: 30px; }
          .section-title { font-size: 18px; font-weight: bold; color: #ef4444; border-left: 4px solid #ef4444; padding-left: 10px; margin-bottom: 20px; text-transform: uppercase; }
          .insight-box { background: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .insight-header { font-weight: bold; color: #991b1b; margin-bottom: 10px; font-size: 14px; }
          .list-item { margin-bottom: 8px; font-size: 13px; line-height: 1.5; position: relative; padding-left: 15px; }
          .list-item:before { content: "•"; position: absolute; left: 0; color: #ef4444; font-weight: bold; }
          .score-circle { width: 100px; height: 100px; border-radius: 50%; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; margin: 0 auto 20px auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Viral Video Report</div>
          <div class="subtitle">Exclusive Analysis: ${formData.title}</div>
        </div>

        <div class="metrics-grid">
           <div class="metric-box">
              <div class="metric-val">${formData.views.toLocaleString()}</div>
              <div class="metric-label">Total Views</div>
           </div>
           <div class="metric-box">
              <div class="metric-val">${engagementRate}%</div>
              <div class="metric-label">Engagement Rate</div>
           </div>
           <div class="metric-box">
              <div class="metric-val">${formData.shares.toLocaleString()}</div>
              <div class="metric-label">Total Shares</div>
           </div>
        </div>

        <div class="section">
           <div class="score-circle">${analysis.viralityScore}</div>
           <div style="text-align:center; font-weight:bold; margin-bottom:30px;">AI Virality Score / 100</div>

           <div class="section-title">Why It Went Viral</div>
           <div class="insight-box">
              ${analysis.whyItWorked.map(pt => `<div class="list-item">${pt}</div>`).join('')}
           </div>

           <div class="section-title">Strategic Breakdown</div>
           <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div class="insight-box">
                 <div class="insight-header">HOOK ANALYSIS</div>
                 <p style="font-size:13px; margin:0;">${analysis.hookAnalysis}</p>
              </div>
              <div class="insight-box">
                 <div class="insight-header">ENGAGEMENT QUALITY</div>
                 <p style="font-size:13px; margin:0;">${analysis.engagementQuality}</p>
              </div>
           </div>

           <div class="section-title">Recommended Next Steps</div>
           <div class="insight-box" style="background:#f0fdf4; border-color:#dcfce7;">
              ${analysis.nextSteps.map(pt => `<div class="list-item" style="color:#166534;">${pt}</div>`).join('')}
           </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Viral_Report_${formData.title.replace(/\s+/g, '_')}_${dateStr}.xls`;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[calc(100vh-100px)]">
        {/* INPUT PANEL */}
        <div className="w-full lg:w-1/3 bg-gray-800 border border-gray-700 rounded-xl p-6 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-red-500/20 p-2 rounded-lg">
                    <Flame className="w-6 h-6 text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Viral Deep Dive</h2>
                    <p className="text-xs text-gray-400">Generate an exclusive report for a single video.</p>
                </div>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Video Title / Hook</label>
                    <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. My crazy morning routine..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Platform</label>
                        <select className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:outline-none" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                            <option>TikTok</option>
                            <option>Instagram Reels</option>
                            <option>YouTube Shorts</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Niche</label>
                        <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} placeholder="e.g. Tech" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Product (Optional)</label>
                    <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:outline-none" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} placeholder="e.g. LED Lights" />
                </div>

                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase mb-2">
                        <Target className="w-4 h-4 text-blue-400" /> Performance Metrics
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase">Views</label>
                            <input required type="number" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-red-500 outline-none" value={formData.views} onChange={e => setFormData({...formData, views: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase">Likes</label>
                            <input required type="number" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-pink-500 outline-none" value={formData.likes} onChange={e => setFormData({...formData, likes: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase">Comments</label>
                            <input required type="number" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-blue-500 outline-none" value={formData.comments} onChange={e => setFormData({...formData, comments: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase">Shares</label>
                            <input required type="number" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-green-500 outline-none" value={formData.shares} onChange={e => setFormData({...formData, shares: Number(e.target.value)})} />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-gray-500 uppercase">Saves / Favorites</label>
                            <input required type="number" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded focus:border-yellow-500 outline-none" value={formData.saves} onChange={e => setFormData({...formData, saves: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Brain className="w-5 h-5"/>}
                    {loading ? 'Analyzing Video...' : 'Generate Exclusive Report'}
                </button>
            </form>
        </div>

        {/* REPORT PANEL */}
        <div className="w-full lg:w-2/3 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col relative">
            {!analysis ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-10 text-center">
                    <div className="bg-gray-800 p-6 rounded-full mb-6 animate-pulse">
                        <Sparkles className="w-16 h-16 opacity-30 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-500">Ready to Analyze</h3>
                    <p className="max-w-sm mt-2">Enter your viral video stats on the left to generate a professional deep-dive report.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
                    
                    {/* Report Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-xs tracking-widest mb-1">
                                <Flame className="w-4 h-4" /> Viral Analysis
                            </div>
                            <h1 className="text-3xl font-black text-white leading-tight max-w-xl">{formData.title}</h1>
                            <p className="text-gray-400 mt-2 text-sm">{new Date().toLocaleDateString()} • {formData.platform}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500">{analysis.viralityScore}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase mt-1">Virality Score</div>
                        </div>
                    </div>

                    {/* Metrics Bar */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                            <Eye className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-white">{formData.views.toLocaleString()}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Views</div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                            <Heart className="w-5 h-5 text-pink-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-white">{formData.likes.toLocaleString()}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Likes</div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                            <Share2 className="w-5 h-5 text-green-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-white">{formData.shares.toLocaleString()}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Shares</div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                            <Bookmark className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-white">{formData.saves.toLocaleString()}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Saves</div>
                        </div>
                    </div>

                    {/* Analysis Content */}
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" /> Why It Worked
                            </h3>
                            <ul className="space-y-3">
                                {analysis.whyItWorked.map((point, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                        <div className="bg-yellow-500/20 p-1 rounded mt-0.5">
                                            <CheckCircle className="w-3 h-3 text-yellow-400" />
                                        </div>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-sm font-bold text-blue-300 uppercase mb-3">Hook Analysis</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{analysis.hookAnalysis}</p>
                            </div>
                            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-sm font-bold text-pink-300 uppercase mb-3">Engagement Quality</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{analysis.engagementQuality}</p>
                            </div>
                        </div>

                        <div className="bg-green-900/10 p-6 rounded-xl border border-green-500/20">
                            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5" /> Recommended Next Steps
                            </h3>
                            <ul className="space-y-3">
                                {analysis.nextSteps.map((step, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm text-green-200">
                                        <ArrowRight className="w-4 h-4 text-green-500" />
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Export Bar */}
            {analysis && (
                <div className="p-4 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm flex justify-between items-center sticky bottom-0">
                    <span className="text-xs text-gray-500">Report ready for presentation</span>
                    <button 
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Export Excel Report
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default ViralReportGenerator;