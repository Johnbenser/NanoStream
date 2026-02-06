import React, { useState, useEffect } from 'react';
import { FGSoraError } from '../types';
import { subscribeToFGSoraErrors, saveFGSoraError, deleteFGSoraError } from '../services/storageService';
import { Bug, Plus, Trash2, Calendar, Download, Search, AlertCircle, X } from 'lucide-react';

const FGSoraReporter: React.FC = () => {
  const [errors, setErrors] = useState<FGSoraError[]>([]);
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'all'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Generation Failure',
    description: '',
    steps: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  useEffect(() => {
    const unsubscribe = subscribeToFGSoraErrors(
      (data) => setErrors(data),
      (error) => console.error("Error loading logs", error)
    );
    return () => unsubscribe();
  }, []);

  const filteredErrors = errors.filter(err => {
    if (viewPeriod === 'daily') {
      return err.date === selectedDate;
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveFGSoraError(formData);
      setIsModalOpen(false);
      setFormData({ ...formData, description: '', steps: '' });
    } catch (e) {
      alert("Failed to save log.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this error log?")) {
      await deleteFGSoraError(id);
    }
  };

  const generateReportHtml = () => {
    const rows = filteredErrors.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.time}</td>
        <td>${e.category}</td>
        <td>${e.description}</td>
        <td>${e.steps}</td>
      </tr>
    `).join('');

    return `
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <h3>FG SORA Error Report - ${viewPeriod === 'daily' ? selectedDate : 'All Time'}</h3>
        <table border="1">
          <thead>
            <tr style="background-color:#fee2e2; font-weight:bold;">
              <th>Date</th>
              <th>Time</th>
              <th>Category</th>
              <th>Description</th>
              <th>Steps to Reproduce</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <Bug className="w-6 h-6 text-red-500" />
             <h2 className="text-xl font-bold text-white">FG SORA Error Logs</h2>
           </div>
           <p className="text-gray-400 text-sm">Track bugs, glitches, and generation failures for the dev team.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
             <Plus className="w-4 h-4"/> Log Error
           </button>
           <button onClick={handleExport} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold">
             <Download className="w-4 h-4"/> Export Log
           </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
         <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setViewPeriod('daily')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewPeriod === 'daily' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Daily View
            </button>
            <button 
              onClick={() => setViewPeriod('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewPeriod === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              All History
            </button>
         </div>

         {viewPeriod === 'daily' && (
            <div className="relative">
               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input 
                 type="date" 
                 className="bg-gray-900 border border-gray-700 text-white pl-9 pr-3 py-1.5 rounded-lg text-sm focus:ring-1 focus:ring-red-500 outline-none [color-scheme:dark]"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
               />
            </div>
         )}
      </div>

      {/* Logs List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
         {filteredErrors.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
               <Bug className="w-12 h-12 mb-3 opacity-20" />
               <p>No errors logged for this period.</p>
            </div>
         ) : (
            <div className="divide-y divide-gray-700">
               {filteredErrors.map(err => (
                 <div key={err.id} className="p-4 hover:bg-gray-750/50 transition-colors flex gap-4">
                    <div className="flex flex-col items-center justify-center bg-red-900/20 border border-red-500/20 rounded-lg p-3 min-w-[80px] text-center">
                       <span className="text-xs text-red-300 font-bold uppercase">{err.time}</span>
                       <span className="text-[10px] text-red-400/70">{err.date}</span>
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-start mb-1">
                          <h4 className="text-white font-bold">{err.category}</h4>
                          <button onClick={() => handleDelete(err.id)} className="text-gray-500 hover:text-red-400">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                       <p className="text-gray-300 text-sm mb-2">{err.description}</p>
                       <div className="bg-gray-900/50 p-2 rounded text-xs text-gray-400 font-mono border border-gray-700/50">
                          <span className="text-gray-500 select-none">Steps: </span>{err.steps}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         )}
      </div>

      {/* Add Log Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl p-6">
               <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-700">
                  <h3 className="text-xl font-bold text-white">Log New Error</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
               </div>
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                        <select 
                           className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-1 focus:ring-red-500 outline-none mt-1"
                           value={formData.category}
                           onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                           <option>Generation Failure</option>
                           <option>Glitched Visuals</option>
                           <option>Audio Sync Issue</option>
                           <option>Platform Crash</option>
                           <option>Prompt Rejected</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Time</label>
                        <input 
                           type="time" 
                           className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-1 focus:ring-red-500 outline-none mt-1 [color-scheme:dark]"
                           value={formData.time}
                           onChange={e => setFormData({...formData, time: e.target.value})}
                        />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                     <textarea 
                        required
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-1 focus:ring-red-500 outline-none mt-1 resize-none"
                        placeholder="What happened?"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase">Steps to Reproduce</label>
                     <textarea 
                        required
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-1 focus:ring-red-500 outline-none mt-1 resize-none font-mono text-sm"
                        placeholder="1. Clicked Generate..."
                        value={formData.steps}
                        onChange={e => setFormData({...formData, steps: e.target.value})}
                     />
                  </div>
                  <div className="flex justify-end pt-2">
                     <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold">Save Log</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default FGSoraReporter;