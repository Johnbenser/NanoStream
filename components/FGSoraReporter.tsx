
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Upload, FileSpreadsheet, Loader2, Image as ImageIcon, X, CheckCircle, Bug, Calendar, Clock, Plus, Trash2, ChevronDown, Filter, ExternalLink, Copy, FileText, Cloud, Settings, RefreshCcw, Link as LinkIcon } from 'lucide-react';
import { uploadFile, saveFGSoraError, subscribeToFGSoraErrors, deleteFGSoraError } from '../services/storageService';
import { FGSoraError } from '../types';
import { auth } from '../services/firebase';

declare global {
  interface Window {
    google: any;
  }
}

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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  // View/Export State
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Google Integration State
  const [gDriveToken, setGDriveToken] = useState<string | null>(null);
  const [gClientId, setGClientId] = useState<string>('');
  const [isPushingToDrive, setIsPushingToDrive] = useState(false);
  const [showClientInput, setShowClientInput] = useState(false);
  const [linkedSheetId, setLinkedSheetId] = useState<string | null>(null);

  useEffect(() => {
    const savedClientId = localStorage.getItem('gml_google_client_id');
    const savedSheetId = localStorage.getItem('gml_target_sheet_id');
    
    if (savedClientId) setGClientId(savedClientId);
    if (savedSheetId) setLinkedSheetId(savedSheetId);

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
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!id) return;

      if(window.confirm("Are you sure you want to delete this error log?")) {
          const previousErrors = [...errors];
          setErrors(prev => prev.filter(item => item.id !== id));
          try {
            await deleteFGSoraError(id);
          } catch (err) {
            console.error("Delete operation failed:", err);
            alert("Failed to delete item. It will reappear.");
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
          const dateComp = b.date.localeCompare(a.date);
          if (dateComp !== 0) return dateComp;
          return b.time.localeCompare(a.time);
      });
  };

  const filteredErrors = getFilteredErrors();

  // --- REPORT GENERATION (HTML for Excel) ---
  const generateReportHtml = () => {
      const currentUser = auth.currentUser?.email || "Unknown User";
      const generateDate = new Date().toLocaleString();
      let periodLabel = '';
      if (viewPeriod === 'daily') periodLabel = `Daily Report: ${selectedDate}`;
      else if (viewPeriod === 'monthly') periodLabel = `Monthly Report: ${selectedMonth}`;
      else periodLabel = `Yearly Report: ${selectedYear}`;

      const tableRows = filteredErrors.map(log => {
        const safeUrl = log.imageUrl ? log.imageUrl.replace(/&/g, '&amp;').replace(/%2F/g, '%252F') : '';
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

      return `
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
            </style>
        </head>
        <body>
            <div class="header-container"><div class="report-title">System Error Report</div><div class="site-name">FGSORA.COM Monitoring Log</div></div>
            <table class="meta-table">
                <tr><td class="meta-label">Report Period</td><td class="meta-value">${periodLabel}</td></tr>
                <tr><td class="meta-label">Generated By</td><td class="meta-value">${currentUser}</td></tr>
                <tr><td class="meta-label">Generated On</td><td class="meta-value">${generateDate}</td></tr>
            </table>
            <table class="data-table">
                <thead><tr><th style="text-align:center;">Date</th><th style="text-align:center;">Time</th><th>Error Category</th><th>Description</th><th>Steps to Reproduce</th><th style="text-align:center;">Screenshot</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </body>
        </html>
      `;
  };

  const handleExport = () => {
      if (filteredErrors.length === 0) {
          alert("No logs to export for this period.");
          return;
      }
      const htmlContent = generateReportHtml();
      let filename = viewPeriod === 'daily' ? `FGSORA_Daily_${selectedDate}` : `FGSORA_Report`;
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.xls`;
      link.click();
  };

  // --- GOOGLE SHEETS API LOGIC ---
  const saveSettings = () => {
      localStorage.setItem('gml_google_client_id', gClientId);
      setShowClientInput(false);
  };

  const resetSpreadsheetLink = () => {
      if(window.confirm("Unlink current spreadsheet? The next push will create a new file.")) {
          localStorage.removeItem('gml_target_sheet_id');
          setLinkedSheetId(null);
      }
  };

  // Helper to convert hex color to Google Sheets RGB (0-1 scale)
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        red: parseInt(result[1], 16) / 255,
        green: parseInt(result[2], 16) / 255,
        blue: parseInt(result[3], 16) / 255
    } : { red: 1, green: 1, blue: 1 };
  };

  const pushToGoogleSheets = async (accessToken: string) => {
      setIsPushingToDrive(true);
      try {
          const currentUser = auth.currentUser?.email || "Unknown User";
          const generateDate = new Date().toLocaleString();
          let periodLabel = '';
          if (viewPeriod === 'daily') periodLabel = `Daily Report: ${selectedDate}`;
          else if (viewPeriod === 'monthly') periodLabel = `Monthly Report: ${selectedMonth}`;
          else periodLabel = `Yearly Report: ${selectedYear}`;

          let spreadsheetId = localStorage.getItem('gml_target_sheet_id');
          const timestamp = new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});
          const sheetTitle = viewPeriod === 'daily' 
            ? `${selectedDate} (${timestamp})`
            : `${selectedMonth} Report (${timestamp})`;

          // 1. Create Spreadsheet if not linked
          if (!spreadsheetId) {
              const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ properties: { title: 'Global Media Live - Master Reports' } })
              });
              const createData = await createRes.json();
              if (createData.error) throw new Error(createData.error.message);
              
              spreadsheetId = createData.spreadsheetId;
              localStorage.setItem('gml_target_sheet_id', spreadsheetId!);
              setLinkedSheetId(spreadsheetId!);
          }

          // 2. Add New Sheet (Tab)
          const addSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetTitle } } }] })
          });
          
          const addSheetData = await addSheetRes.json();
          if (addSheetData.error) {
              if (addSheetData.error.message.includes('Requested entity was not found')) {
                  localStorage.removeItem('gml_target_sheet_id');
                  setLinkedSheetId(null);
                  throw new Error("Linked Spreadsheet not found. It may have been deleted. Please try again to create a new one.");
              }
              throw new Error(`Failed to create tab: ${addSheetData.error.message}`);
          }

          const newSheetId = addSheetData.replies[0].addSheet.properties.sheetId;

          // 3. Prepare Data Layout
          // Row 1: Title
          // Row 2: Subtitle
          // Row 3: Empty
          // Row 4-6: Metadata
          // Row 7: Empty
          // Row 8: Table Header
          // Row 9+: Data
          
          const titleRows = [
              ["SYSTEM ERROR REPORT"],
              ["FGSORA.COM Monitoring Log"],
              [],
              ["Report Period", periodLabel],
              ["Generated By", currentUser],
              ["Generated On", generateDate],
              [],
              ["Date", "Time", "Category", "Description", "Steps", "Image Evidence"] // Row 8
          ];

          const dataRows = filteredErrors.map(e => [
              e.date, 
              e.time, 
              e.category, 
              e.description, 
              e.steps || '', 
              e.imageUrl || ''
          ]);

          const allValues = [...titleRows, ...dataRows];

          // 4. Write Values
          const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetTitle}!A1?valueInputOption=USER_ENTERED`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: allValues })
          });

          if (!writeRes.ok) throw new Error("Failed to write data");

          // 5. Apply Styles (The "Design")
          const batchUpdateRequests = [
              // 1. Merge & Style Main Title (A1:F1)
              {
                  mergeCells: { range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 }, mergeType: "MERGE_ALL" }
              },
              {
                  repeatCell: {
                      range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
                      cell: { userEnteredFormat: { 
                          backgroundColor: hexToRgb("#1f2937"), 
                          horizontalAlignment: "CENTER",
                          textFormat: { foregroundColor: hexToRgb("#fca5a5"), fontSize: 18, bold: true }
                      }},
                      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                  }
              },
              // 2. Merge & Style Subtitle (A2:F2)
              {
                  mergeCells: { range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 }, mergeType: "MERGE_ALL" }
              },
              {
                  repeatCell: {
                      range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 },
                      cell: { userEnteredFormat: { 
                          backgroundColor: hexToRgb("#1f2937"), 
                          horizontalAlignment: "CENTER",
                          textFormat: { foregroundColor: hexToRgb("#ffffff"), fontSize: 12, bold: true }
                      }},
                      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                  }
              },
              // 3. Style Metadata Labels (A4:A6)
              {
                  repeatCell: {
                      range: { sheetId: newSheetId, startRowIndex: 3, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 1 },
                      cell: { userEnteredFormat: { 
                          backgroundColor: hexToRgb("#f3f4f6"), 
                          textFormat: { bold: true, foregroundColor: hexToRgb("#374151") }
                      }},
                      fields: "userEnteredFormat(backgroundColor,textFormat)"
                  }
              },
              // 4. Style Table Headers (A8:F8) - Red Background
              {
                  repeatCell: {
                      range: { sheetId: newSheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 0, endColumnIndex: 6 },
                      cell: { userEnteredFormat: { 
                          backgroundColor: hexToRgb("#7f1d1d"), 
                          horizontalAlignment: "CENTER",
                          textFormat: { foregroundColor: hexToRgb("#ffffff"), bold: true }
                      }},
                      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                  }
              },
              // 5. Set Column Widths (Description needs to be wider)
              {
                  updateDimensionProperties: {
                      range: { sheetId: newSheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 }, // Col D (Description)
                      properties: { pixelSize: 400 },
                      fields: "pixelSize"
                  }
              },
              // 6. Data Table Styling (Borders & Alignment)
              {
                  repeatCell: {
                      range: { sheetId: newSheetId, startRowIndex: 8, endRowIndex: 8 + dataRows.length, startColumnIndex: 0, endColumnIndex: 6 },
                      cell: { userEnteredFormat: { 
                          borders: {
                              top: { style: "SOLID" }, bottom: { style: "SOLID" }, left: { style: "SOLID" }, right: { style: "SOLID" }
                          },
                          verticalAlignment: "TOP",
                          wrapStrategy: "WRAP"
                      }},
                      fields: "userEnteredFormat(borders,verticalAlignment,wrapStrategy)"
                  }
              },
              // 7. Alternating Row Colors (Banding)
              {
                  addBanding: {
                      bandedRange: {
                          range: { sheetId: newSheetId, startRowIndex: 8, endRowIndex: 8 + dataRows.length, startColumnIndex: 0, endColumnIndex: 6 },
                          rowProperties: {
                              firstBandColor: hexToRgb("#ffffff"),
                              secondBandColor: hexToRgb("#fef2f2") // Light Red
                          }
                      }
                  }
              }
          ];

          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ requests: batchUpdateRequests })
          });

          if (window.confirm(`Success! Added new tab "${sheetTitle}" with styling.\n\nOpen Spreadsheet now?`)) {
              window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
          }

      } catch (e: any) {
          console.error(e);
          alert(`Google Sheets Error: ${e.message}`);
      } finally {
          setIsPushingToDrive(false);
      }
  };

  const handlePushToSheets = () => {
      if (filteredErrors.length === 0) {
          alert("No logs to push.");
          return;
      }
      if (!gClientId) {
          setShowClientInput(true);
          return;
      }
      if (!window.google) {
          alert("Google API not loaded. Refresh page.");
          return;
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: gClientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                  setGDriveToken(tokenResponse.access_token);
                  pushToGoogleSheets(tokenResponse.access_token);
              }
          },
      });

      // Attempt to reuse token if valid, else request new
      tokenClient.requestAccessToken();
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
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col relative">
            {/* Header / Filter */}
            <div className="p-4 border-b border-gray-800 bg-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="bg-gray-700 p-2 rounded-lg shrink-0">
                        <Calendar className="w-5 h-5 text-gray-300" />
                    </div>
                    
                    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                        <button onClick={() => setViewPeriod('daily')} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${viewPeriod === 'daily' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Daily</button>
                        <button onClick={() => setViewPeriod('monthly')} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${viewPeriod === 'monthly' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Monthly</button>
                        <button onClick={() => setViewPeriod('yearly')} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${viewPeriod === 'yearly' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Yearly</button>
                    </div>

                    <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>

                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                            {viewPeriod === 'daily' ? 'Select Date' : viewPeriod === 'monthly' ? 'Select Month' : 'Select Year'}
                        </label>
                        {viewPeriod === 'daily' && <input type="date" className="bg-transparent text-white font-bold text-sm outline-none [color-scheme:dark]" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />}
                        {viewPeriod === 'monthly' && <input type="month" className="bg-transparent text-white font-bold text-sm outline-none [color-scheme:dark]" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />}
                        {viewPeriod === 'yearly' && (
                            <select className="bg-transparent text-white font-bold text-sm outline-none bg-gray-800" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <button onClick={() => setShowClientInput(true)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500" title="API & Sheet Settings"><Settings className="w-4 h-4" /></button>
                    <button onClick={handlePushToSheets} disabled={filteredErrors.length === 0 || isPushingToDrive} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg disabled:opacity-50 whitespace-nowrap">
                        {isPushingToDrive ? <Loader2 className="w-4 h-4 animate-spin"/> : <Cloud className="w-4 h-4" />} <span className="hidden sm:inline">Push to Sheets</span>
                    </button>
                    <button onClick={handleExport} disabled={filteredErrors.length === 0} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg disabled:opacity-50 whitespace-nowrap">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/50">
                {filteredErrors.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                        <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
                        <p>No errors logged for this period.</p>
                        <p className="text-sm mt-1">FGSORA systems running smoothly.</p>
                    </div>
                ) : (
                    filteredErrors.map((error) => (
                        <div key={error.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex gap-4 hover:border-red-500/30 transition-all group">
                            <div className="flex flex-col items-center justify-start pt-1 min-w-[80px] border-r border-gray-700 pr-4">
                                <Clock className="w-4 h-4 text-gray-500 mb-1" />
                                <span className="text-lg font-bold text-white">{error.time}</span>
                                {viewPeriod !== 'daily' && <span className="text-[10px] text-gray-500">{new Date(error.date).toLocaleDateString()}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-medium truncate ${error.category.includes('FAILURE') ? 'text-red-400 font-bold' : 'text-white'}`}>{error.category}</h4>
                                    <button onClick={(e) => handleDelete(error.id, e)} className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">{error.description}</p>
                                {error.steps && <div className="mt-2 text-xs text-gray-500 bg-gray-900/50 p-2 rounded"><span className="font-bold text-gray-400">Steps:</span> {error.steps}</div>}
                            </div>
                            {error.imageUrl && (
                                <div className="w-24 h-24 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shrink-0 relative group/img">
                                    <img src={error.imageUrl} alt="Error" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                                    <a href={error.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity"><ExternalLink className="w-6 h-6 text-white" /></a>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Google Client ID Modal */}
            {showClientInput && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full shadow-2xl space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-700 pb-4">
                            <div className="bg-blue-500/20 p-2 rounded-lg"><Settings className="w-5 h-5 text-blue-400" /></div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Integration Settings</h3>
                                <p className="text-xs text-gray-400">Manage Google Sheets & Drive connection</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase">Google Client ID</label>
                            <input 
                                type="text" 
                                placeholder="7177...apps.googleusercontent.com"
                                className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={gClientId}
                                onChange={(e) => setGClientId(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">Required for authentication.</p>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                <LinkIcon className="w-3 h-3"/> Connected Spreadsheet
                            </label>
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-300 font-mono truncate max-w-[200px]">
                                    {linkedSheetId ? linkedSheetId : 'Not connected'}
                                </div>
                                {linkedSheetId && (
                                    <button onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${linkedSheetId}`, '_blank')} className="text-blue-400 hover:underline text-xs">
                                        Open
                                    </button>
                                )}
                            </div>
                            {linkedSheetId && (
                                <button onClick={resetSpreadsheetLink} className="w-full mt-2 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg text-xs transition-colors border border-red-500/20">
                                    <RefreshCcw className="w-3 h-3" /> Unlink / Reset Sheet
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowClientInput(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm font-medium">Close</button>
                            <button onClick={saveSettings} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg">Save Settings</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default FGSoraReporter;
