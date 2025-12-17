
import React, { useState } from 'react';
import { 
  AlertTriangle, Plus, Search, Filter, ShieldAlert, CheckCircle, 
  HelpCircle, Trash2, Edit2, Upload, Video, User, 
  BookOpen, Target, Scale, Loader2, ExternalLink, X, FileSpreadsheet, Calendar, Tag, Brain, Sparkles, AlertCircle
} from 'lucide-react';
import { Creator, ReportedVideo, ReportAnalysisResult } from '../types';
import { saveReport, deleteReport, uploadFile } from '../services/storageService';
import { analyzeViolations } from '../services/geminiService';

interface ReportedContentProps {
  creators: Creator[];
  reports: ReportedVideo[];
  currentUser?: string;
}

const VIOLATION_TYPES = [
  'Unoriginal Content',
  'Copyright Infringement', 
  'Community Guidelines', 
  'Low Quality / Spam', 
  'Misleading Information',
  'Inappropriate Content',
  'Unauthorized Brand Usage'
];

const PRODUCT_CATEGORIES = ['Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];

const ReportedContent: React.FC<ReportedContentProps> = ({ creators, reports, currentUser }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Analysis State
  const [analysis, setAnalysis] = useState<ReportAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<Omit<ReportedVideo, 'id'>>({
    creatorId: '',
    creatorName: '',
    videoTitle: '',
    videoUrl: '',
    productCategory: 'Maikalian',
    violationType: 'Unoriginal Content',
    sanctions: '',
    actionPlan: '',
    remarks: '',
    status: 'OPEN',
    dateReported: new Date().toISOString().split('T')[0]
  });

  const handleOpenModal = (report?: ReportedVideo) => {
    if (report) {
      setEditingId(report.id);
      setFormData({
        creatorId: report.creatorId,
        creatorName: report.creatorName,
        videoTitle: report.videoTitle,
        videoUrl: report.videoUrl,
        productCategory: report.productCategory || 'Maikalian',
        violationType: report.violationType,
        sanctions: report.sanctions,
        actionPlan: report.actionPlan,
        remarks: report.remarks || '', // Fallback for old data
        status: report.status,
        dateReported: report.dateReported
      });
    } else {
      setEditingId(null);
      setFormData({
        creatorId: '',
        creatorName: '',
        videoTitle: '',
        videoUrl: '',
        productCategory: 'Maikalian',
        violationType: 'Unoriginal Content',
        sanctions: '',
        actionPlan: '',
        remarks: '',
        status: 'OPEN',
        dateReported: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleCreatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const creatorId = e.target.value;
    const creator = creators.find(c => c.id === creatorId);
    setFormData(prev => ({
      ...prev,
      creatorId,
      creatorName: creator ? creator.name : ''
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      try {
        const file = e.target.files[0];
        const path = `reports/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);
        setFormData(prev => ({ ...prev, videoUrl: url }));
      } catch (error) {
        alert("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creatorId) {
      alert("Please select a creator.");
      return;
    }
    try {
      await saveReport(formData, editingId || undefined);
      setIsModalOpen(false);
    } catch (error) {
      alert("Failed to save report.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the report for "${title}"?`)) {
      await deleteReport(id, title);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (reports.length === 0) return;
    setAnalyzing(true);
    try {
      const result = await analyzeViolations(reports);
      setAnalysis(result);
    } catch (error: any) {
      console.error(error);
      alert("Failed to generate AI insights.");
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'RESOLVED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'APPEAL': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-gray-400';
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch = r.videoTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // --- EXPORT FUNCTIONALITY ---
  const handleExportExcel = () => {
    const username = currentUser ? currentUser.split('@')[0] : 'Unknown User';
    const generateDate = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];

    const tableStyle = `
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; }
        .header-container { padding: 20px 0; text-align: left; border-bottom: 3px solid #b91c1c; margin-bottom: 20px; }
        .brand-text { color: #991b1b; font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; }
        .campaign-text { color: #000000; font-size: 16px; font-weight: bold; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-data { color: #374151; font-size: 11px; margin-top: 15px; font-family: monospace; }
        
        /* AI Section Styles */
        .ai-section { background-color: #fef2f2; border: 1px solid #fee2e2; padding: 15px; margin-bottom: 25px; border-radius: 4px; }
        .ai-header { color: #991b1b; font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #fca5a5; padding-bottom: 5px; }
        .ai-content h4 { color: #7f1d1d; font-size: 12px; font-weight: bold; margin: 10px 0 5px 0; }
        .ai-content p { color: #1f2937; font-size: 11px; margin: 0 0 5px 0; line-height: 1.4; }
        .ai-list { margin: 0; padding-left: 20px; }
        .ai-list li { color: #1f2937; font-size: 11px; margin-bottom: 2px; }

        /* Guide Section Styles */
        .guide-section { margin-top: 50px; border-top: 5px solid #4c1d95; padding-top: 20px; background-color: #f5f3ff; padding: 20px; }
        .guide-super-title { font-size: 24px; font-weight: 900; color: #4c1d95; margin-bottom: 20px; text-transform: uppercase; }
        .guide-title { font-size: 16px; font-weight: bold; color: #4c1d95; margin-bottom: 10px; margin-top: 20px; text-decoration: underline; }
        .guide-subtitle { font-size: 14px; font-weight: bold; color: #b91c1c; margin-top: 15px; margin-bottom: 5px; }
        .guide-p { font-size: 12px; color: #1f2937; line-height: 1.5; margin-bottom: 10px; }
        .guide-ul { margin-left: 20px; margin-bottom: 15px; }
        .guide-li { font-size: 12px; color: #1f2937; margin-bottom: 5px; font-weight: bold; }
        .guide-li-desc { font-weight: normal; display: block; margin-top: 2px; color: #4b5563; }
        .highlight { background-color: #ffff00; font-weight: bold; }

        /* Table Styles */
        table { border-collapse: collapse; width: 100%; border: 1px solid #e5e7eb; margin-bottom: 30px; }
        th { background-color: #991b1b; color: white; border: 1px solid #7f1d1d; padding: 12px 10px; text-align: left; font-weight: bold; font-size: 11px; white-space: nowrap; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: middle; color: #1f2937; font-size: 11px; }
        tr:nth-child(even) { background-color: #fef2f2; }
        .status-open { color: #dc2626; font-weight: bold; }
        .status-resolved { color: #16a34a; font-weight: bold; }
        .status-appeal { color: #d97706; font-weight: bold; }
      </style>
    `;

    // Construct AI Section HTML if analysis exists
    let aiSectionHtml = '';
    if (analysis) {
        aiSectionHtml = `
          <div class="ai-section">
             <div class="ai-header">Violation Analysis & Insights</div>
             <div class="ai-content">
                <h4>Summary of Remarks</h4>
                <p>${analysis.summary}</p>
                
                <h4>Main Reasons for Violations</h4>
                <ul class="ai-list">
                   ${analysis.mainReasons.map(r => `<li>${r}</li>`).join('')}
                </ul>

                <h4>Recommendations</h4>
                <ul class="ai-list">
                   ${analysis.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
             </div>
          </div>
        `;
    }

    // Static Guide HTML content
    const guideHtml = `
      <div class="guide-section">
        <div class="guide-super-title">Appendix: Violation Prevention Guide</div>
        
        <div class="guide-title">Why "Unoriginal Content" is Triggering</div>
        <p class="guide-p">Platforms (TikTok, Reels, Shorts) use two primary detection methods: <strong>Audio Waveforms</strong> and <strong>Visual Semantic Matching</strong>.</p>
        
        <div class="guide-subtitle">1. The Audio Fingerprint (The Biggest Culprit)</div>
        <p class="guide-p">If you generate 100 videos using the same Text-to-Speech (TTS) voice reading the same script, the audio waveform is nearly identical for every video.</p>
        <p class="guide-p"><em>The Algorithm's View:</em> It "hears" the exact same audio file uploaded by multiple accounts and assumes it is spam or stolen.</p>

        <div class="guide-subtitle">2. Visual Similarity (The AI Avatar Trap)</div>
        <p class="guide-p">AI avatars (HeyGen, D-ID, etc.) are static. Even with camera pans, the pixel data remains 90% identical.</p>
        <p class="guide-p"><em>The Algorithm's View:</em> It sees the same "person" in the same "room" across 50 accounts. Flags as "Mass Produced".</p>

        <div class="guide-subtitle">3. Coordinated Behavior</div>
        <p class="guide-p">Multiple nano creators uploading similar videos linking to the same shop simultaneously triggers "content farm" filters.</p>

        <br/>
        <div class="guide-title">How to Fix This (Strategic Pivot)</div>
        <p class="guide-p">You must introduce high variability into raw assets before distribution.</p>

        <div class="guide-subtitle">1. Vary the Audio (Critical)</div>
        <ul class="guide-ul">
            <li class="guide-li">Script Spinning <span class="guide-li-desc">Do not use one script. Create 5-10 variations. Change the "Hook" (first 3 seconds) for every batch.</span></li>
            <li class="guide-li">Voice Rotation <span class="guide-li-desc">Rotate between 4-5 different TTS voices (gender, accent, speed).</span></li>
            <li class="guide-li">Speed & Pitch <span class="guide-li-desc">Alter speed (1.05x) in post-production.</span></li>
        </ul>

        <div class="guide-subtitle">2. Break the Visual Pattern (B-Roll)</div>
        <p class="guide-p">The AI Avatar should not be on screen for 100% of the video.</p>
        <ul class="guide-ul">
            <li class="guide-li">The Sandwich Method: <span class="guide-li-desc">0:00-0:03 Avatar (Hook) -> 0:03-0:10 Product B-Roll -> 0:10-0:15 Avatar (CTA).</span></li>
        </ul>

        <div class="guide-subtitle">3. Change the Environment</div>
        <p class="guide-p">Generate avatars on Green Screen. Instruct creators to put their own photo/video background. This makes every video visually unique.</p>

        <div class="guide-subtitle">4. The "Remix" Strategy (Best for Nano Creators)</div>
        <p class="guide-p">Instead of giving a finished video, ask creators to use the "Green Screen" filter on TikTok. They record themselves nodding while the AI video plays in the background. This adds a "human" element.</p>

        <br/>
        <div class="guide-title" style="color: #16a34a;">Summary Checklist for Next Batch</div>
        <ul class="guide-ul">
            <li class="guide-li">Script: <span class="guide-li-desc">Write 5 variations of the hook.</span></li>
            <li class="guide-li">Audio: <span class="guide-li-desc">Use 3 different AI voices.</span></li>
            <li class="guide-li">Visuals: <span class="guide-li-desc">Add overlays/B-roll so avatar isn't visible the whole time.</span></li>
            <li class="guide-li">Background: <span class="guide-li-desc">Swap background image or use green screen.</span></li>
        </ul>
      </div>
    `;

    const tableRows = filteredReports.map(r => `
      <tr>
        <td>${r.dateReported}</td>
        <td style="font-weight:bold;">${r.creatorName}</td>
        <td>${r.videoTitle}</td>
        <td>${r.productCategory || 'N/A'}</td>
        <td>${r.violationType}</td>
        <td class="status-${r.status.toLowerCase()}">${r.status}</td>
        <td>${r.sanctions || '-'}</td>
        <td>${r.actionPlan || '-'}</td>
        <td>${r.remarks || '-'}</td>
        <td><a href="${r.videoUrl}">View Evidence</a></td>
      </tr>
    `).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        ${tableStyle}
      </head>
      <body>
        <div class="header-container">
          <div class="brand-text">Global Media Live</div>
          <div class="campaign-text">TikTok Violation Reports Log</div>
          <div class="meta-data">Generated by: ${username} | Date: ${generateDate} | Source: nano-stream.vercel.app</div>
        </div>
        
        ${aiSectionHtml}

        <table>
          <thead>
            <tr>
              <th>Date Reported</th>
              <th>Creator Name</th>
              <th>Video Identifier</th>
              <th>Product Category</th>
              <th>Violation Type</th>
              <th>Current Status</th>
              <th>TikTok Sanctions</th>
              <th>Action Plan</th>
              <th>Remarks</th>
              <th>Evidence Link</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        ${guideHtml}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GML_Violations_Report_${dateStr}.xls`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <ShieldAlert className="w-6 h-6 text-red-500" />
             Violations & Reports
           </h2>
           <p className="text-gray-400 text-sm mt-1">
             Database of content violations reported by TikTok. Track statuses and internal resolutions.
           </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-red-900/20"
        >
          <Plus className="w-4 h-4" /> Log TikTok Report
        </button>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
         <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Brain className="w-5 h-5 text-purple-400" />
               <h3 className="font-bold text-white">Violation Analysis & Insights</h3>
            </div>
            {!analyzing && (
               <button 
                 onClick={handleGenerateAnalysis}
                 className="text-xs flex items-center gap-1 bg-purple-600/20 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all"
               >
                 <Sparkles className="w-3 h-3" /> {analysis ? 'Regenerate Insights' : 'Generate Insights'}
               </button>
            )}
         </div>
         
         {analyzing ? (
            <div className="p-8 flex justify-center items-center text-gray-400">
               <Loader2 className="w-6 h-6 animate-spin mr-2 text-purple-500" />
               Analyzing report remarks and violation patterns...
            </div>
         ) : analysis ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase flex items-center gap-2">
                     <BookOpen className="w-4 h-4 text-blue-400" /> Summary of Remarks
                   </h4>
                   <p className="text-gray-400 text-sm leading-relaxed mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                      {analysis.summary}
                   </p>
                   
                   <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase flex items-center gap-2">
                     <AlertCircle className="w-4 h-4 text-red-400" /> Main Reasons for Violations
                   </h4>
                   <ul className="space-y-1">
                      {analysis.mainReasons.map((r, i) => (
                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                           <span className="text-red-500/50 mt-1">•</span> {r}
                        </li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase flex items-center gap-2">
                     <Target className="w-4 h-4 text-green-400" /> Strategic Recommendations
                   </h4>
                   <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-4">
                      <ul className="space-y-2">
                         {analysis.recommendations.map((r, i) => (
                           <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              {r}
                           </li>
                         ))}
                      </ul>
                   </div>
                   <div className="mt-4 text-xs text-gray-500 italic">
                      * This analysis is included in the Excel export.
                   </div>
                </div>
            </div>
         ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
               Click "Generate Insights" to let AI analyze your violation reports and identify root causes.
            </div>
         )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 justify-between items-center">
        <div className="flex flex-1 gap-4 w-full">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input 
                 type="text"
                 placeholder="Search creator or violation..."
                 className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 border border-gray-700 shrink-0">
               <Filter className="w-4 h-4 text-gray-500 ml-2" />
               <select 
                 className="bg-transparent text-white text-sm font-medium p-1.5 focus:outline-none cursor-pointer"
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
               >
                 <option value="ALL">All Status</option>
                 <option value="OPEN">Open Cases</option>
                 <option value="RESOLVED">Resolved</option>
                 <option value="APPEAL">Under Appeal</option>
               </select>
            </div>
        </div>
        
        {/* Export Button */}
        <button 
            onClick={handleExportExcel}
            className="w-full xl:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
        >
            <FileSpreadsheet className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
          <ShieldAlert className="w-12 h-12 text-gray-600 mb-3" />
          <p className="text-gray-400">No reports found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredReports.map(report => (
            <div key={report.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col shadow-lg hover:border-red-500/30 transition-all">
               
               {/* Card Header */}
               <div className="p-5 border-b border-gray-700 bg-gray-900/40 flex justify-between items-start">
                 <div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${getStatusColor(report.status)}`}>
                        {report.status === 'OPEN' ? <AlertTriangle className="w-3 h-3"/> : report.status === 'RESOLVED' ? <CheckCircle className="w-3 h-3"/> : <HelpCircle className="w-3 h-3"/>}
                        {report.status}
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">{report.videoTitle}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-gray-400 text-sm mt-1">
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> <span className="text-blue-400">{report.creatorName}</span></span>
                        <span className="text-gray-600">•</span>
                        <span>{report.violationType}</span>
                        <span className="text-gray-600">•</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                           report.productCategory === 'Maikalian' ? 'text-pink-300 bg-pink-900/20 border-pink-500/20' : 
                           report.productCategory === 'Xmas Curtain' ? 'text-red-300 bg-red-900/20 border-red-500/20' : 
                           'text-blue-300 bg-blue-900/20 border-blue-500/20'
                        }`}>{report.productCategory || 'Unknown'}</span>
                    </div>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => handleOpenModal(report)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                   <button onClick={() => handleDelete(report.id, report.videoTitle)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                 </div>
               </div>

               {/* Video Preview */}
               <div className="bg-black/50 p-4 flex items-center gap-4 border-b border-gray-700">
                 <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 border border-gray-700">
                   <Video className="w-6 h-6 text-gray-500" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <p className="text-xs text-gray-400 mb-1 font-mono">Evidence File</p>
                   {report.videoUrl ? (
                     <a href={report.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1 truncate">
                       View Reported Content <ExternalLink className="w-3 h-3" />
                     </a>
                   ) : (
                     <span className="text-sm text-gray-500 italic">No video attached</span>
                   )}
                 </div>
               </div>

               {/* Details */}
               <div className="p-5 space-y-4 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-1">
                            <Scale className="w-3 h-3" /> TikTok Sanctions
                        </div>
                        <p className="text-sm text-gray-300">{report.sanctions || 'None specified'}</p>
                     </div>
                     <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-1">
                            <Target className="w-3 h-3" /> Internal Plan
                        </div>
                        <p className="text-sm text-gray-300">{report.actionPlan || 'Pending'}</p>
                     </div>
                  </div>
                  
                  {report.remarks && (
                    <div className="bg-gray-700/20 p-3 rounded-lg border border-gray-700/30">
                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase mb-1">
                            <BookOpen className="w-3 h-3" /> Remarks
                        </div>
                        <p className="text-sm text-gray-300 italic">"{report.remarks}"</p>
                    </div>
                  )}
               </div>

               <div className="px-5 py-3 bg-gray-900 border-t border-gray-700 text-xs text-gray-500 flex justify-between items-center">
                  <span>Reported on: {new Date(report.dateReported).toLocaleDateString()}</span>
                  <span className="font-mono">ID: {report.id.slice(0,6)}</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 sticky top-0 z-10">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 {editingId ? <Edit2 className="w-5 h-5 text-blue-400"/> : <ShieldAlert className="w-5 h-5 text-red-400"/>}
                 {editingId ? 'Update Report Case' : 'Log New TikTok Violation'}
               </h2>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* 1. Who & When */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Creator Involved</label>
                      <div className="relative">
                         <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                         <select 
                           required
                           className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none appearance-none"
                           value={formData.creatorId}
                           onChange={handleCreatorChange}
                         >
                           <option value="">Select Creator...</option>
                           {creators.map(c => (
                             <option key={c.id} value={c.id}>{c.name}</option>
                           ))}
                         </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Date of Violation</label>
                      <div className="relative">
                         <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                         <input 
                           type="date"
                           required
                           className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none [color-scheme:dark]"
                           value={formData.dateReported}
                           onChange={e => setFormData({...formData, dateReported: e.target.value})}
                         />
                      </div>
                   </div>
                </div>

                {/* 2. What */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Product Category</label>
                      <div className="relative">
                         <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                         <select 
                           className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none appearance-none"
                           value={formData.productCategory}
                           onChange={e => setFormData({...formData, productCategory: e.target.value})}
                         >
                           {PRODUCT_CATEGORIES.map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Violation Type</label>
                      <div className="relative">
                         <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                         <select 
                           className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none appearance-none"
                           value={formData.violationType}
                           onChange={e => setFormData({...formData, violationType: e.target.value})}
                         >
                           {VIOLATION_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                         </select>
                      </div>
                   </div>
                </div>

                {/* 3. Video Evidence */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                   <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                     <Video className="w-4 h-4 text-blue-400" /> Video Evidence
                   </h3>
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">Video Title / Identifier</label>
                        <input 
                           type="text" 
                           required
                           placeholder="e.g. Offensive Meme V2"
                           className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                           value={formData.videoTitle}
                           onChange={e => setFormData({...formData, videoTitle: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400">Upload Video File</label>
                            <label className={`flex items-center justify-center gap-2 w-full p-2 bg-gray-800 border border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                               {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-400"/> : <Upload className="w-4 h-4 text-gray-400"/>}
                               <span className="text-sm text-gray-300">{uploading ? 'Uploading...' : 'Choose File'}</span>
                               <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400">Or Paste External Link</label>
                            <input 
                               type="text" 
                               placeholder="https://..."
                               className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                               value={formData.videoUrl}
                               onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                            />
                         </div>
                      </div>
                      {formData.videoUrl && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Evidence attached
                        </p>
                      )}
                   </div>
                </div>

                {/* 4. Resolution Details */}
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-400 uppercase">Sanctions (from TikTok)</label>
                         <textarea 
                           rows={3}
                           placeholder="e.g. Strike 1, 24hr Suspension"
                           className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                           value={formData.sanctions}
                           onChange={e => setFormData({...formData, sanctions: e.target.value})}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-400 uppercase">Internal Action Plan</label>
                         <textarea 
                           rows={3}
                           placeholder="e.g. Retake compliance training"
                           className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                           value={formData.actionPlan}
                           onChange={e => setFormData({...formData, actionPlan: e.target.value})}
                         />
                      </div>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Remarks / Notes</label>
                      <div className="relative">
                         <BookOpen className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                         <textarea 
                           rows={2}
                           placeholder="Additional context or lessons learned..."
                           className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                           value={formData.remarks}
                           onChange={e => setFormData({...formData, remarks: e.target.value})}
                         />
                      </div>
                   </div>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                   <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Status:</label>
                      <select 
                         className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-1.5 focus:outline-none"
                         value={formData.status}
                         onChange={e => setFormData({...formData, status: e.target.value as any})}
                      >
                         <option value="OPEN">Open</option>
                         <option value="RESOLVED">Resolved</option>
                         <option value="APPEAL">Appeal</option>
                      </select>
                   </div>
                   <button 
                      type="submit"
                      disabled={uploading}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all disabled:opacity-50"
                   >
                      {editingId ? 'Update Report' : 'File Report'}
                   </button>
                </div>
             </form>
           </div>
         </div>
      )}

    </div>
  );
};

export default ReportedContent;
