import React, { useState } from 'react';
import { Flame, Search, Loader2, Download, AlertCircle, PlayCircle } from 'lucide-react';
import { analyzeViralVideo, scrapeVideoStats } from '../services/geminiService';
import { ViralReportResult } from '../types';

const ViralReportGenerator: React.FC = () => {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    niche: '',
    product: '',
    platform: 'TikTok',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0
  });

  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [analysis, setAnalysis] = useState<ViralReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!formData.url) return;
    setScraping(true);
    try {
      const stats = await scrapeVideoStats(formData.url);
      if (stats) {
        setFormData(prev => ({
          ...prev,
          views: stats.views,
          likes: stats.likes,
          comments: stats.comments,
          shares: stats.shares
        }));
      } else {
        setError("Could not auto-scrape stats. Please enter manually.");
      }
    } catch (e) {
      console.error(e);
      setError("Scraping failed.");
    } finally {
      setScraping(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeViralVideo(formData);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze video.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analysis) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const engagementRate = formData.views > 0 ? ((formData.likes + formData.comments + formData.shares + formData.saves) / formData.views * 100).toFixed(2) : "0";

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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in max-w-7xl mx-auto">
      {/* Input Form */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-white">Viral Video Analyzer</h2>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
           {/* URL Input & Scrape */}
           <div className="space-y-2">
             <label className="text-xs font-bold text-gray-400 uppercase">Video URL</label>
             <div className="flex gap-2">
                <input 
                  type="url" 
                  className="flex-1 bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="https://tiktok.com/..."
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={handleScrape}
                  disabled={scraping || !formData.url}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                  Fetch
                </button>
             </div>
           </div>

           {/* Metadata */}
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase">Video Title / Hook</label>
                 <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase">Niche</label>
                 <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
              </div>
           </div>

           {/* Stats Grid */}
           <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase">Views</label>
                 <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={formData.views} onChange={e => setFormData({...formData, views: Number(e.target.value)})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase">Likes</label>
                 <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={formData.likes} onChange={e => setFormData({...formData, likes: Number(e.target.value)})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase">Comments</label>
                 <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={formData.comments} onChange={e => setFormData({...formData, comments: Number(e.target.value)})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase">Shares</label>
                 <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:outline-none" value={formData.shares} onChange={e => setFormData({...formData, shares: Number(e.target.value)})} />
              </div>
           </div>

           {error && (
             <div className="text-red-400 text-sm flex items-center gap-2 bg-red-900/20 p-3 rounded-lg border border-red-500/20">
               <AlertCircle className="w-4 h-4"/> {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
           >
             {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <PlayCircle className="w-5 h-5"/>}
             {loading ? 'Analyzing Video...' : 'Generate Viral Report'}
           </button>
        </form>
      </div>

      {/* Analysis Output */}
      <div className="space-y-6">
         {analysis ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
               {/* Header */}
               <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-center relative overflow-hidden">
                  <div className="relative z-10">
                     <h3 className="text-white font-bold text-2xl uppercase tracking-wider mb-1">Viral Breakdown</h3>
                     <p className="text-white/80 text-sm">{formData.title}</p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Flame className="w-24 h-24 text-white" />
                  </div>
               </div>

               {/* Score */}
               <div className="p-6 text-center border-b border-gray-700">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-red-500 text-red-400 text-4xl font-bold mb-2">
                     {analysis.viralityScore}
                  </div>
                  <p className="text-sm text-gray-400 uppercase font-bold tracking-widest">Virality Score</p>
               </div>

               {/* Insights */}
               <div className="p-6 space-y-6">
                  <div>
                     <h4 className="text-red-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" /> Why it worked
                     </h4>
                     <ul className="space-y-2">
                        {analysis.whyItWorked.map((reason, idx) => (
                           <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                              <span className="text-red-500 font-bold">•</span>
                              {reason}
                           </li>
                        ))}
                     </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Hook Analysis</h5>
                        <p className="text-sm text-gray-300">{analysis.hookAnalysis}</p>
                     </div>
                     <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Engagement</h5>
                        <p className="text-sm text-gray-300">{analysis.engagementQuality}</p>
                     </div>
                  </div>

                  <div>
                     <h4 className="text-green-400 text-sm font-bold uppercase mb-3">Actionable Next Steps</h4>
                     <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4">
                        <ul className="space-y-2">
                           {analysis.nextSteps.map((step, idx) => (
                              <li key={idx} className="text-green-200 text-sm flex items-start gap-2">
                                 <span className="text-green-500 font-bold">→</span>
                                 {step}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>

                  <button 
                    onClick={handleExport}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                     <Download className="w-4 h-4" /> Export Excel Report
                  </button>
               </div>
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed p-12">
               <Flame className="w-16 h-16 mb-4 opacity-20" />
               <p className="text-center">Enter video stats to generate<br/>an AI-powered viral breakdown.</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default ViralReportGenerator;