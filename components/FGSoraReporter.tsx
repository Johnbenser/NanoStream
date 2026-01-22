
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Upload, FileSpreadsheet, Loader2, Image as ImageIcon, X, CheckCircle, Bug, Calendar, Clock, Plus, Trash2, ChevronDown, Filter, ExternalLink } from 'lucide-react';
import { uploadFile, saveFGSoraError, subscribeToFGSoraErrors, deleteFGSoraError } from '../services/storageService';
import { FGSoraError } from '../types';
import { auth } from '../services/firebase';

const FGSoraReporter: React.FC = () => {
  // Form State
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [errorType, setErrorType] = useState('Generation Failure');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data State
  const [errors, setErrors] = useState<FGSoraError[]>([]);
  
  // View/Export State
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const unsubscribe = subscribeToFGSoraErrors(
      (data) => setErrors(data),
      (error) => console.error("Error syncing logs", error)
    );
    return () => unsubscribe();
  }, []);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImageFile(file);
        setUploading(true);
        try {
            const path = `fgsora_reports/${Date.now()}_${file.name}`;
            const url = await uploadFile(file, path);
            setImageUrl(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload screenshot.");
            setImageFile(null);
        } finally {
            setUploading(false);
        }
    }
  };

  const clearImage = () => {
      setImageFile(null);
      setImageUrl(null);
  };

  const handleLog = async () => {
      if (!description) return;
      setIsSubmitting(true);
      try {
          // Construct payload, conditionally adding imageUrl only if it exists
          const payload: any = {
              date,
              time,
              category: errorType,
              description,
              steps
          };
          
          if (imageUrl) {
              payload.imageUrl = imageUrl;
          }

          await saveFGSoraError(payload);
          
          // Reset Form
          setDescription('');
          setSteps('');
          setImageUrl(null);
          setImageFile(null);
          setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
          alert("Failed to save log.");
          console.error(e);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
      // 1. Event Safety
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }

      if (!id) {
          console.error("Attempted to delete with missing ID");
          return;
      }

      if(window.confirm("Are you sure you want to delete this error log?")) {
          // 2. Optimistic Update: Remove from UI immediately
          const previousErrors = [...errors];
          setErrors(prev => prev.filter(item => item.id !== id));
          
          try {
            // 3. Perform Server Delete
            await deleteFGSoraError(id);
          } catch (err) {
            console.error("Delete operation failed:", err);
            alert("Failed to delete item. It will reappear.");
            // 4. Rollback UI if failed
            setErrors(previousErrors);
          }
      }
  };

  // --- FILTER LOGIC ---
  const getFilteredErrors = () => {
      return errors.filter(e => {
          if (viewPeriod === 'daily') return e.date === selectedDate;
          if (viewPeriod === 'monthly') return e.date.startsWith(selectedMonth);
          if (viewPeriod === 'yearly') return e.date.startsWith(selectedYear);
          return false;
      }).sort((a,b) => {
          // Sort by Date desc, then Time desc
          const dateComp = b.date.localeCompare(a.date);
          if (dateComp !== 0) return dateComp;
          return b.time.localeCompare(a.time);
      });
  };

  const filteredErrors = getFilteredErrors();

  // --- EXPORT LOGIC ---
  const handleExport = () => {
      if (filteredErrors.length === 0) {
          alert("No logs to export for this period.");
          return;
      }

      const currentUser = auth.currentUser?.email || "Unknown User";
      const generateDate = new Date().toLocaleString();
      
      let periodLabel = '';
      let filename = '';

      if (viewPeriod === 'daily') {
          periodLabel = `Daily Report: ${selectedDate}`;
          filename = `FGSORA_Daily_Report_${selectedDate}`;
      } else if (viewPeriod === 'monthly') {
          periodLabel = `Monthly Report: ${selectedMonth}`;
          filename = `FGSORA_Monthly_Report_${selectedMonth}`;
      } else {
          periodLabel = `Yearly Report: ${selectedYear}`;
          filename = `FGSORA_Yearly_Report_${selectedYear}`;
      }

      const tableRows = filteredErrors.map(log => {
        // Fix for Excel Link Handling
        const safeUrl = log.imageUrl 
            ? log.imageUrl.replace(/&/g, '&amp;').replace(/%2F/g, '%252F') 
            : '';
        
        return `
        <tr>
            <td style="text-align:center;">${log.date}</td>
            <td style="text-align:center;">${log.time}</td>
            <td style="font-weight:bold; color: #dc2626;">${log.category}</td>
            <td>${log.description}</td>
            <td>${log.steps || '-'}</td>
            <td style="text-align:center;">
                ${safeUrl ? `<a href="${safeUrl}" style="color:blue; text-decoration:underline;">View Evidence</a>` : 'No Image'}
            </td>
        </tr>
      `}).join('');

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; }
                .header-container { padding: 30px; text-align: center; border-bottom: 4px solid #dc2626; background-color: #1f2937; color: white; }
                .report-title { font-size: 28px; font-weight: 900; margin: 0; letter-spacing: 1px; text-transform: uppercase; color: #fca5a5; }
                .site-name { font-size: 16px; font-weight: bold; margin-top: 5px; color: #ffffff; }
                .meta-table { width: 100%; margin: 20px 0; border: 1px solid #e5e7eb; }
                .meta-label { font-weight: bold; background-color: #f3f4f6; padding: 8px; width: 200px; color: #374151; }
                .meta-value { padding: 8px; color: #1f2937; }
                
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                table.data-table th { background-color: #7f1d1d; color: white; padding: 12px; text-align: left; border: 1px solid #991b1b; font-size: 12px; text-transform: uppercase; }
                table.data-table td { padding: 10px; border: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; color: #1f2937; }
                table.data-table tr:nth-child(even) { background-color: #fef2f2; }
                
                .footer { margin-top: 30px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="report-title">System Error Report</div>
                <div class="site-name">FGSORA.COM Monitoring Log</div>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td class="meta-label">Report Period</td>
                    <td class="meta-value">${periodLabel}</td>
                </tr>
                <tr>
                    <td class="meta-label">Generated By</td>
                    <td class="meta-value">${currentUser}</td>
                </tr>
                <tr>
                    <td class="meta-label">Generated On</td>
                    <td class="meta-value">${generateDate}</td>
                </tr>
                <tr>
                    <td class="meta-label">Source System</td>
                    <td class="meta-value">Global Media Live Dashboard</td>
                </tr>
            </table>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="text-align:center;">Date</th>
                        <th style="text-align:center;">Time</th>
                        <th>Error Category</th>
                        <th>Description</th>
                        <th>Steps to Reproduce</th>
                        <th style="text-align:center;">Screenshot</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <div class="footer">
                Confidential Report • Generated via Global Media Live • FGSORA.COM Analysis
            </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.xls`;
      link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in h-[calc(100vh-140px)]">
        
        {/* LEFT: FORM SECTION */}
        <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6 text-red-400">
                <Bug className="w-6 h-6" />
                <h2 className="text-xl font-bold text-white">Log New Error</h2>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                        <input 
                            type="date" 
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-red-500 outline-none [color-scheme:dark]"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Time</label>
                        <input 
                            type="time" 
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-red-500 outline-none [color-scheme:dark]"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Error Category</label>
                    <select 
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-red-500 outline-none"
                        value={errorType}
                        onChange={(e) => setErrorType(e.target.value)}
                    >
                        <option>Generation Failure</option>
                        <option>API FAILURE</option>
                        <option>CONGESTED IN WEBAPI</option>
                        <option>Visual Glitch / Artifacts</option>
                        <option>System Crash</option>
                        <option>Login / Access Issue</option>
                        <option>Slow Performance</option>
                        <option>Other</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                    <textarea 
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        placeholder="What happened?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Steps (Optional)</label>
                    <textarea 
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        placeholder="How to reproduce..."
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Screenshot</label>
                    {!imageUrl && !uploading ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700/50 hover:border-red-500 transition-all">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-400">Click to upload</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    ) : uploading ? (
                        <div className="flex flex-col items-center justify-center w-full h-24 bg-gray-900/50 rounded-lg border border-gray-700">
                            <Loader2 className="w-6 h-6 text-red-500 animate-spin mb-1" />
                            <span className="text-xs text-gray-400">Uploading...</span>
                        </div>
                    ) : (
                        <div className="relative w-full h-32 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group">
                            <img src={imageUrl!} alt="Error" className="w-full h-full object-contain" />
                            <button 
                                onClick={clearImage}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleLog}
                    disabled={!description || uploading || isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Plus className="w-5 h-5"/>}
                    Add to Daily Log
                </button>
            </div>
        </div>

        {/* RIGHT: LIST / CALENDAR VIEW */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
            {/* Header / Filter */}
            <div className="p-4 border-b border-gray-800 bg-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="bg-gray-700 p-2 rounded-lg shrink-0">
                        <Calendar className="w-5 h-5 text-gray-300" />
                    </div>
                    
                    {/* View Period Selector */}
                    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                        <button 
                            onClick={() => setViewPeriod('daily')}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${viewPeriod === 'daily' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Daily
                        </button>
                        <button 
                            onClick={() => setViewPeriod('monthly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${viewPeriod === 'monthly' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button 
                            onClick={() => setViewPeriod('yearly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${viewPeriod === 'yearly' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Yearly
                        </button>
                    </div>

                    <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>

                    {/* Date Inputs based on Period */}
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                            {viewPeriod === 'daily' ? 'Select Date' : viewPeriod === 'monthly' ? 'Select Month' : 'Select Year'}
                        </label>
                        {viewPeriod === 'daily' && (
                            <input 
                                type="date" 
                                className="bg-transparent text-white font-bold text-sm outline-none focus:text-red-400 transition-colors [color-scheme:dark]"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        )}
                        {viewPeriod === 'monthly' && (
                            <input 
                                type="month" 
                                className="bg-transparent text-white font-bold text-sm outline-none focus:text-red-400 transition-colors [color-scheme:dark]"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            />
                        )}
                        {viewPeriod === 'yearly' && (
                            <select 
                                className="bg-transparent text-white font-bold text-sm outline-none focus:text-red-400 transition-colors bg-gray-800"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleExport}
                    disabled={filteredErrors.length === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    <FileSpreadsheet className="w-4 h-4" /> Export {viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)} Report
                </button>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/50">
                {filteredErrors.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                        <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
                        <p>No errors logged for this {viewPeriod.slice(0, -2)}.</p>
                        <p className="text-sm mt-1">FGSORA systems running smoothly.</p>
                    </div>
                ) : (
                    filteredErrors.map((error) => (
                        <div key={error.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex gap-4 hover:border-red-500/30 transition-all group">
                            {/* Time/Date Column */}
                            <div className="flex flex-col items-center justify-start pt-1 min-w-[80px] border-r border-gray-700 pr-4">
                                <Clock className="w-4 h-4 text-gray-500 mb-1" />
                                <span className="text-lg font-bold text-white">{error.time}</span>
                                {viewPeriod !== 'daily' && (
                                    <span className="text-[10px] text-gray-500">{new Date(error.date).toLocaleDateString()}</span>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-medium truncate ${
                                        error.category === 'API FAILURE' || error.category === 'CONGESTED IN WEBAPI' ? 'text-red-400 font-bold' : 'text-white'
                                    }`}>
                                        {error.category}
                                    </h4>
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDelete(error.id, e)}
                                        className="p-2 bg-gray-900/80 hover:bg-red-900/30 border border-gray-700 hover:border-red-500/50 text-gray-400 hover:text-red-400 rounded-lg transition-all z-10 shrink-0 cursor-pointer relative"
                                        title="Delete Entry"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">{error.description}</p>
                                {error.steps && (
                                    <div className="mt-2 text-xs text-gray-500 bg-gray-900/50 p-2 rounded">
                                        <span className="font-bold text-gray-400">Steps:</span> {error.steps}
                                    </div>
                                )}
                            </div>

                            {/* Image Thumbnail */}
                            {error.imageUrl && (
                                <div className="w-24 h-24 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shrink-0 relative group/img">
                                    <img src={error.imageUrl} alt="Error" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                                    <a 
                                        href={error.imageUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                    >
                                        <ExternalLink className="w-6 h-6 text-white" />
                                    </a>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default FGSoraReporter;
