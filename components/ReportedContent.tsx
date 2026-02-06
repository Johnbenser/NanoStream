import React, { useState } from 'react';
import { ReportedVideo, Creator, ReportAnalysisResult } from '../types';
import { Edit2, Trash2, Plus, Download, ShieldAlert, Brain, Loader2, Search, ExternalLink, X } from 'lucide-react';
import { saveReport, deleteReport } from '../services/storageService';
import { analyzeViolations } from '../services/geminiService';

interface ReportedContentProps {
  reports: ReportedVideo[];
  creators: Creator[];
  currentUser?: string;
}

const ReportedContent: React.FC<ReportedContentProps> = ({ reports, creators, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportedVideo | null>(null);
  
  // Analysis State
  const [analysis, setAnalysis] = useState<ReportAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState<Partial<ReportedVideo>>({
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

  const filteredReports = reports.filter(r => 
    r.videoTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.violationType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (report?: ReportedVideo) => {
    if (report) {
      setEditingReport(report);
      setFormData(report);
    } else {
      setEditingReport(null);
      setFormData({
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
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveReport(formData, editingReport?.id);
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save report.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete report for "${title}"?`)) {
      await deleteReport(id, title);
    }
  };

  const handleRunAnalysis = async () => {
    if (filteredReports.length === 0) return;
    setAnalyzing(true);
    try {
      const result = await analyzeViolations(filteredReports);
      setAnalysis(result);
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    
    const tableRows = filteredReports.map(r => {
      // Escape the URL to ensure full link is preserved in Excel
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" /> Violation Reports
          </h2>
          <p className="text-gray-400 text-sm">Track copyright strikes, guideline violations, and sanctions.</p>
        </div>
        <div className="flex gap-3">
             <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                <Plus className="w-4 h-4"/> New Report
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                <Download className="w-4 h-4"/> Export
            </button>
        </div>
      </div>

      {/* AI Analysis Button & Panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
         <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                 <Brain className="w-5 h-5 text-purple-400" />
                 <h3 className="font-bold text-white">AI Safety Analysis</h3>
             </div>
             <button 
                onClick={handleRunAnalysis} 
                disabled={analyzing}
                className="text-sm bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
             >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Brain className="w-4 h-4" />}
                {analyzing ? 'Analyzing...' : 'Analyze Violations'}
             </button>
         </div>
         {analysis && (
             <div className="space-y-4 animate-fade-in">
                 <div className="bg-gray-900/50 p-4 rounded-lg">
                     <p className="text-sm text-gray-300 font-bold mb-1">Summary</p>
                     <p className="text-sm text-gray-400">{analysis.summary}</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-gray-900/50 p-4 rounded-lg border border-red-900/30">
                         <p className="text-sm text-red-400 font-bold mb-2">Root Causes</p>
                         <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                             {analysis.mainReasons.map((r, i) => <li key={i}>{r}</li>)}
                         </ul>
                     </div>
                     <div className="bg-gray-900/50 p-4 rounded-lg border border-green-900/30">
                         <p className="text-sm text-green-400 font-bold mb-2">Recommendations</p>
                         <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                             {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                         </ul>
                     </div>
                 </div>
             </div>
         )}
      </div>

      {/* Reports Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search violations..." 
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
                <tr>
                   <th className="px-6 py-3">Date</th>
                   <th className="px-6 py-3">Creator / Video</th>
                   <th className="px-6 py-3">Violation</th>
                   <th className="px-6 py-3">Status</th>
                   <th className="px-6 py-3 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-700">
               {filteredReports.map(report => (
                 <tr key={report.id} className="hover:bg-gray-750/50">
                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{report.dateReported}</td>
                    <td className="px-6 py-4">
                        <div className="font-bold text-white">{report.videoTitle}</div>
                        <div className="text-xs text-gray-500">{report.creatorName}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="bg-red-900/20 text-red-300 px-2 py-1 rounded border border-red-500/20 text-xs font-bold">
                            {report.violationType}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{report.sanctions}</div>
                    </td>
                    <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${
                             report.status === 'RESOLVED' ? 'bg-green-900/20 text-green-400' :
                             report.status === 'APPEAL' ? 'bg-yellow-900/20 text-yellow-400' :
                             'bg-blue-900/20 text-blue-400'
                         }`}>
                             {report.status}
                         </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                             {report.videoUrl && (
                                <a href={report.videoUrl} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                             )}
                             <button onClick={() => handleOpenModal(report)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleDelete(report.id, report.videoTitle)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
                  <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                     <h3 className="text-xl font-bold text-white">{editingReport ? 'Edit Report' : 'File Violation'}</h3>
                     <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-400 uppercase">Creator</label>
                         <select 
                            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            value={formData.creatorId}
                            onChange={e => {
                                const creator = creators.find(c => c.id === e.target.value);
                                setFormData({
                                    ...formData, 
                                    creatorId: e.target.value,
                                    creatorName: creator ? creator.name : ''
                                });
                            }}
                         >
                            <option value="">Select Creator...</option>
                            {creators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Video Title</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.videoTitle} onChange={e => setFormData({...formData, videoTitle: e.target.value})}/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Violation Type</label>
                            <select className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.violationType} onChange={e => setFormData({...formData, violationType: e.target.value})}>
                                <option value="Copyright">Copyright</option>
                                <option value="Guidelines">Community Guidelines</option>
                                <option value="Music">Music Usage</option>
                                <option value="Low Quality">Low Quality</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                            <select className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                <option value="OPEN">Open</option>
                                <option value="APPEAL">Appeal</option>
                                <option value="RESOLVED">Resolved</option>
                            </select>
                         </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Sanctions / Penalty</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Video Removal, Warning" value={formData.sanctions} onChange={e => setFormData({...formData, sanctions: e.target.value})}/>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Remarks</label>
                        <textarea className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none h-24" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})}/>
                     </div>
                     <div className="flex justify-end pt-4">
                         <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg">Save Report</button>
                     </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ReportedContent;