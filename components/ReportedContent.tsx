import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, Search, Plus, Edit2, Trash2, CheckCircle, 
  FileSpreadsheet, ExternalLink, X, AlertTriangle, Brain, Loader2, RefreshCw
} from 'lucide-react';
import { ReportedVideo, Creator, ReportAnalysisResult } from '../types';
import { saveReport, deleteReport } from '../services/storageService';
import { analyzeViolations } from '../services/geminiService';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';

interface ReportedContentProps {
  creators: Creator[];
  reports: ReportedVideo[];
  currentUser?: string;
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

const ReportedContent: React.FC<ReportedContentProps> = ({ creators, reports, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI State
  const [analysis, setAnalysis] = useState<ReportAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ReportedVideo, 'id'>>({
    creatorId: '',
    creatorName: '',
    videoTitle: '',
    videoUrl: '',
    productCategory: 'Other',
    violationType: 'Copyright',
    sanctions: '',
    actionPlan: '',
    remarks: '',
    status: 'OPEN',
    dateReported: new Date().toISOString().split('T')[0]
  });

  // Filter
  const filteredReports = reports.filter(r => 
    r.videoTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chart Data
  const typeChartData = useMemo(() => {
     const counts: Record<string, number> = {};
     reports.forEach(r => { counts[r.violationType] = (counts[r.violationType] || 0) + 1; });
     return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  // Actions
  const handleOpenModal = (report?: ReportedVideo) => {
    if (report) {
        setEditingId(report.id);
        setFormData({
            creatorId: report.creatorId,
            creatorName: report.creatorName,
            videoTitle: report.videoTitle,
            videoUrl: report.videoUrl,
            productCategory: report.productCategory,
            violationType: report.violationType,
            sanctions: report.sanctions,
            actionPlan: report.actionPlan,
            remarks: report.remarks,
            status: report.status,
            dateReported: report.dateReported
        });
    } else {
        setEditingId(null);
        setFormData({
            creatorId: '', creatorName: '', videoTitle: '', videoUrl: '',
            productCategory: 'Other', violationType: 'Copyright',
            sanctions: '', actionPlan: '', remarks: '', status: 'OPEN',
            dateReported: new Date().toISOString().split('T')[0]
        });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await saveReport(formData, editingId || undefined);
        setIsModalOpen(false);
    } catch (e) {
        alert("Failed to save report.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if(window.confirm(`Delete report for "${title}"?`)) {
        await deleteReport(id, title);
    }
  };

  const handleAnalyze = async () => {
    if (reports.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
        const result = await analyzeViolations(reports);
        setAnalysis(result);
    } catch (error: any) {
        setAnalysisError("AI Analysis Failed. Check connection.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    
    const tableRows = filteredReports.map(r => {
      // Escape the URL to ensure full link is preserved in Excel
      // Double encode slashes %2F to %252F so Excel decodes to %2F, preserving Firebase path structure
      const safeUrl = r.videoUrl ? r.videoUrl.replace(/&/g, '&amp;').replace(/%2F/g, '%252F') : '';
      
      return `
      <tr>
        <td>${r.dateReported}</td>
        <td>${r.creatorName}</td>
        <td>${r.videoTitle}</td>
        <td>${r.violationType}</td>
        <td>${r.status}</td>
        <td>${r.sanctions}</td>
        <td>${r.remarks}</td>
        <td><a href="${safeUrl}">Video Link</a></td>
      </tr>
    `}).join('');

    const htmlContent = `
      <html>
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      </head>
      <body>
        <h3>Violation Report - ${dateStr}</h3>
        <table border="1">
          <thead>
            <tr style="background-color:#fee2e2; font-weight:bold;">
              <th>Date</th>
              <th>Creator</th>
              <th>Video Title</th>
              <th>Violation</th>
              <th>Status</th>
              <th>Sanctions</th>
              <th>Remarks</th>
              <th>Link</th>
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
    link.download = `Violations_${dateStr}.xls`;
    link.click();
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'RESOLVED': return 'bg-green-900/30 text-green-400 border-green-500/30';
          case 'APPEAL': return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
          default: return 'bg-red-900/30 text-red-400 border-red-500/30';
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* Top Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500"/> Violation Breakdown
                </h3>
                <div className="h-48">
                    {typeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                                    {typeChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">No data</div>
                    )}
                </div>
            </div>

            {/* AI Insight */}
            <div className="lg:col-span-2 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/20 rounded-xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="w-6 h-6 text-red-400" />
                        <h2 className="text-xl font-bold text-white">AI Policy Analysis</h2>
                    </div>
                    {!isAnalyzing && (
                        <button onClick={handleAnalyze} className="text-sm bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all">
                             <RefreshCw className="w-4 h-4" /> {analysis ? 'Refresh Analysis' : 'Analyze Reports'}
                        </button>
                    )}
                </div>

                {isAnalyzing ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
                        <span className="ml-2 text-gray-400">Reviewing violations...</span>
                    </div>
                ) : analysis ? (
                    <div className="space-y-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <p className="text-gray-200 text-sm leading-relaxed">{analysis.summary}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-red-950/30 p-4 rounded-lg border border-red-500/10">
                                <h4 className="text-red-400 font-bold text-xs uppercase mb-2">Root Causes</h4>
                                <ul className="space-y-1">{analysis.mainReasons.map((r,i) => <li key={i} className="text-xs text-gray-400">• {r}</li>)}</ul>
                            </div>
                            <div className="bg-green-950/30 p-4 rounded-lg border border-green-500/10">
                                <h4 className="text-green-400 font-bold text-xs uppercase mb-2">Recommendations</h4>
                                <ul className="space-y-1">{analysis.recommendations.map((r,i) => <li key={i} className="text-xs text-gray-400">• {r}</li>)}</ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        Run analysis to identify patterns and preventive measures for violations.
                    </div>
                )}
            </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search violations..."
                    className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
                 <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
                    <FileSpreadsheet className="w-4 h-4" /> Export Report
                 </button>
                 <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Report Video
                 </button>
             </div>
        </div>

        {/* List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
                         <tr>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4">Report Date</th>
                             <th className="px-6 py-4">Creator / Video</th>
                             <th className="px-6 py-4">Violation Type</th>
                             <th className="px-6 py-4">Sanctions</th>
                             <th className="px-6 py-4 text-center">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-700">
                         {filteredReports.map(report => (
                             <tr key={report.id} className="hover:bg-gray-750/50 transition-colors">
                                 <td className="px-6 py-4">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(report.status)}`}>
                                         {report.status}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-gray-400">{report.dateReported}</td>
                                 <td className="px-6 py-4">
                                     <div className="text-white font-medium">{report.videoTitle}</div>
                                     <div className="text-xs text-gray-500">by {report.creatorName}</div>
                                     {report.videoUrl && (
                                        <a href={report.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline inline-flex items-center mt-1">
                                            View Content <ExternalLink className="w-3 h-3 ml-1"/>
                                        </a>
                                     )}
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className="text-red-300 bg-red-900/20 px-2 py-1 rounded text-xs">{report.violationType}</span>
                                 </td>
                                 <td className="px-6 py-4 text-gray-300 text-xs max-w-[200px] truncate">
                                     {report.sanctions || 'None'}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     <div className="flex justify-center gap-2">
                                         <button onClick={() => handleOpenModal(report)} className="text-gray-400 hover:text-white p-1"><Edit2 className="w-4 h-4"/></button>
                                         <button onClick={() => handleDelete(report.id, report.videoTitle)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                         {filteredReports.length === 0 && (
                             <tr><td colSpan={6} className="text-center py-8 text-gray-500">No reports found.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                        <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Report' : 'Log Violation'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-white"/></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Creator</label>
                            <select 
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5"
                                value={formData.creatorId}
                                onChange={(e) => {
                                    const c = creators.find(creator => creator.id === e.target.value);
                                    if(c) {
                                        setFormData({...formData, creatorId: c.id, creatorName: c.name});
                                    }
                                }}
                            >
                                <option value="">Select Creator...</option>
                                {creators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Video Title</label>
                            <input required className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5" value={formData.videoTitle} onChange={e => setFormData({...formData, videoTitle: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Violation</label>
                                <select className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5" value={formData.violationType} onChange={e => setFormData({...formData, violationType: e.target.value})}>
                                    <option>Copyright</option>
                                    <option>Guideline Violation</option>
                                    <option>Low Quality</option>
                                    <option>Inappropriate Content</option>
                                    <option>Fraud / Scam</option>
                                </select>
                            </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                                <select className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                    <option value="OPEN">Open</option>
                                    <option value="RESOLVED">Resolved</option>
                                    <option value="APPEAL">Appeal</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Video URL</label>
                            <input className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Sanctions / Penalties</label>
                            <input className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5" value={formData.sanctions} onChange={e => setFormData({...formData, sanctions: e.target.value})} placeholder="e.g. Warning, Deduction" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Remarks</label>
                            <textarea rows={3} className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">Cancel</button>
                            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold">Save Report</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default ReportedContent;
