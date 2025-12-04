import React, { useState, useRef } from 'react';
import { 
  Plus, Search, Mail, Phone, Video, MessageCircle, Heart, 
  Trash2, Edit2, LayoutGrid, Table as TableIcon,
  AlertTriangle, Link as LinkIcon, RefreshCw, ExternalLink, Save, X,
  FileSpreadsheet, FileText, Cloud
} from 'lucide-react';
import { Creator, CreatorFormData } from '../types';
import { saveCreator, deleteCreator } from '../services/storageService';
import { scrapeVideoStats } from '../services/geminiService';

interface CreatorListProps {
  creators: Creator[];
  // onRefresh is deprecated since we use real-time listeners now, but keeping for interface comp
  onRefresh?: () => void; 
}

const CreatorList: React.FC<CreatorListProps> = ({ creators }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  // Manual Sync Modal State
  const [isManualSyncOpen, setIsManualSyncOpen] = useState(false);
  const [manualSyncData, setManualSyncData] = useState<{id: string, url: string, views: number, likes: number, comments: number} | null>(null);

  const [formData, setFormData] = useState<CreatorFormData>({
    name: '',
    niche: '',
    email: '',
    phone: '',
    videoLink: '',
    avgViews: 0,
    avgLikes: 0,
    avgComments: 0,
    videosCount: 0
  });

  const handleOpenModal = (creator?: Creator) => {
    if (creator) {
      setEditingId(creator.id);
      setFormData({
        name: creator.name,
        niche: creator.niche,
        email: creator.email,
        phone: creator.phone,
        videoLink: creator.videoLink || '',
        avgViews: creator.avgViews,
        avgLikes: creator.avgLikes,
        avgComments: creator.avgComments,
        videosCount: creator.videosCount
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        niche: '',
        email: '',
        phone: '',
        videoLink: '',
        avgViews: 0,
        avgLikes: 0,
        avgComments: 0,
        videosCount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCreator(formData, editingId || undefined);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (deleteId && deleteName) {
      await deleteCreator(deleteId, deleteName);
      setDeleteId(null);
      setDeleteName(null);
    }
  };

  const handleSyncStats = async (creator: Creator, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!creator.videoLink) {
      alert("Please add a video link first.");
      return;
    }

    setSyncingId(creator.id);
    try {
      const stats = await scrapeVideoStats(creator.videoLink);
      
      if (stats && stats.views > 0) {
        // Success: Auto-update
        const updatedData: CreatorFormData = {
          name: creator.name,
          niche: creator.niche,
          email: creator.email,
          phone: creator.phone,
          videoLink: creator.videoLink,
          videosCount: creator.videosCount,
          avgViews: stats.views,
          avgLikes: stats.likes,
          avgComments: stats.comments,
        };
        await saveCreator(updatedData, creator.id);
      } else {
        // Failure or 0 data: Trigger Manual Override
        setManualSyncData({
          id: creator.id,
          url: creator.videoLink,
          views: creator.avgViews,
          likes: creator.avgLikes,
          comments: creator.avgComments
        });
        setIsManualSyncOpen(true);
      }
    } catch (err) {
      console.error(err);
      setManualSyncData({
        id: creator.id,
        url: creator.videoLink,
        views: creator.avgViews,
        likes: creator.avgLikes,
        comments: creator.avgComments
      });
      setIsManualSyncOpen(true);
    } finally {
      setSyncingId(null);
    }
  };

  const handleManualSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSyncData) return;
    
    const creator = creators.find(c => c.id === manualSyncData.id);
    if (!creator) return;

    const updatedData: CreatorFormData = {
        name: creator.name,
        niche: creator.niche,
        email: creator.email,
        phone: creator.phone,
        videoLink: creator.videoLink,
        videosCount: creator.videosCount,
        avgViews: manualSyncData.views,
        avgLikes: manualSyncData.likes,
        avgComments: manualSyncData.comments,
    };
    await saveCreator(updatedData, creator.id);
    setIsManualSyncOpen(false);
    setManualSyncData(null);
  };

  const handleExportExcel = () => {
    // Styling constants
    const styles = {
      title: 'font-size: 24px; font-weight: bold; color: #4c1d95; margin-bottom: 10px;',
      subtitle: 'color: #666; font-size: 14px; margin-bottom: 20px;',
      table: 'width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; margin-top: 20px;',
      th: 'background-color: #7c3aed; color: white; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold;',
      td: 'padding: 10px; border: 1px solid #ddd; color: #333; vertical-align: middle;',
      tdNum: 'padding: 10px; border: 1px solid #ddd; text-align: right; color: #333; vertical-align: middle;',
      link: 'color: #2563eb; text-decoration: underline;'
    };

    const tableRows = creators.map((c, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="${styles.td}">${c.name}</td>
        <td style="${styles.td}">${c.niche}</td>
        <td style="${styles.td}">${c.email}</td>
        <td style="${styles.td}">${c.phone}</td>
        <td style="${styles.td}">
          <a href="${c.videoLink || '#'}" style="${styles.link}">${c.videoLink ? 'View Video' : '-'}</a>
        </td>
        <td style="${styles.tdNum}">${c.avgViews}</td>
        <td style="${styles.tdNum}">${c.avgLikes}</td>
        <td style="${styles.tdNum}">${c.avgComments}</td>
        <td style="${styles.tdNum}">${c.videosCount}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body>
        <div style="${styles.title}">NanoStream Creator Report</div>
        <div style="${styles.subtitle}">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        
        <table style="${styles.table}">
          <thead>
            <tr>
              <th style="${styles.th}">Creator Name</th>
              <th style="${styles.th}">Niche</th>
              <th style="${styles.th}">Email</th>
              <th style="${styles.th}">Phone</th>
              <th style="${styles.th}">Latest Video</th>
              <th style="${styles.th}">Avg Views</th>
              <th style="${styles.th}">Avg Likes</th>
              <th style="${styles.th}">Avg Comments</th>
              <th style="${styles.th}">Total Videos</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NanoStream_Report_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Niche', 'Email', 'Phone', 'Video Link', 'Avg Views', 'Avg Likes', 'Avg Comments', 'Videos Count'];
    const csvContent = [
      headers.join(','),
      ...creators.map(c => [
        `"${c.name}"`,
        `"${c.niche}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.videoLink || ''}"`,
        c.avgViews,
        c.avgLikes,
        c.avgComments,
        c.videosCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nanostream_backup_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredCreators = creators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex items-center gap-2 text-purple-200 text-sm">
        <Cloud className="w-4 h-4" />
        All changes are automatically synced to Firebase Cloud Database.
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search creators or niches..."
            className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <TableIcon className="w-4 h-4" /> <span className="hidden sm:inline">Spreadsheet</span>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          <div className="w-px h-8 bg-gray-700 mx-2 hidden xl:block"></div>
          
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors" title="Backup Raw Data">
            <FileText className="w-4 h-4" /> CSV
          </button>
          
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20">
            <FileSpreadsheet className="w-4 h-4" /> Export Report
          </button>
          
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/20">
            <Plus className="w-4 h-4" /> Add Creator
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredCreators.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
          <p>No creators found. Add one to start syncing.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
          {filteredCreators.map((creator) => (
            <div key={creator.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-purple-500/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{creator.name}</h3>
                  <span className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded mt-1">
                    {creator.niche}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(creator)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 pointer-events-none" />
                  </button>
                  <button onClick={(e) => handleDeleteClick(creator.id, creator.name, e)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 pointer-events-none" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{creator.email}</span>
                </div>
                {creator.videoLink && (
                  <div className="flex items-center gap-2 text-purple-400 text-sm">
                    <LinkIcon className="w-4 h-4" />
                    <a href={creator.videoLink} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">
                      View Upload
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 py-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                    <Video className="w-3 h-3" /> Views
                  </div>
                  <span className="text-white font-bold">{creator.avgViews.toLocaleString()}</span>
                </div>
                <div className="text-center border-l border-gray-700">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                    <Heart className="w-3 h-3" /> Likes
                  </div>
                  <span className="text-white font-bold">{creator.avgLikes.toLocaleString()}</span>
                </div>
                 <div className="text-center border-l border-gray-700 relative">
                   <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                     <MessageCircle className="w-3 h-3" /> Cmts
                   </div>
                   <span className="text-white font-bold">{creator.avgComments.toLocaleString()}</span>
                    <button 
                      onClick={(e) => handleSyncStats(creator, e)} 
                      disabled={!creator.videoLink || syncingId === creator.id}
                      className={`absolute -top-1 -right-1 p-1.5 rounded-full bg-gray-700 text-gray-300 hover:text-white hover:bg-purple-600 transition-all ${syncingId === creator.id ? 'animate-spin text-purple-400' : ''}`}
                      title="Sync stats from link"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-fade-in shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900 text-gray-200 uppercase font-medium border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Niche</th>
                  <th className="px-6 py-4">Link</th>
                  <th className="px-6 py-4 text-right">Views</th>
                  <th className="px-6 py-4 text-right">Likes</th>
                  <th className="px-6 py-4 text-center">Sync</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCreators.map((creator) => (
                  <tr key={creator.id} className="hover:bg-gray-750/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{creator.name}</td>
                    <td className="px-6 py-4"><span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">{creator.niche}</span></td>
                    <td className="px-6 py-4">
                      {creator.videoLink ? (
                        <a href={creator.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                           Link <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-mono">{creator.avgViews.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-white font-mono">{creator.avgLikes.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                       <button 
                          onClick={(e) => handleSyncStats(creator, e)}
                          disabled={!creator.videoLink || syncingId === creator.id}
                          className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${syncingId === creator.id ? 'animate-spin text-purple-400' : 'text-gray-500 hover:text-white'}`}
                          title="Fetch public stats"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleOpenModal(creator)} className="text-gray-500 hover:text-purple-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => handleDeleteClick(creator.id, creator.name, e)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Creator' : 'Add New Creator'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Previous fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Full Name</label>
                  <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Niche</label>
                  <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Email</label>
                  <input required type="email" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Phone</label>
                  <input required type="tel" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              {/* New Field: Video Link */}
               <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Latest AI Video Link</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                      type="url" 
                      placeholder="https://tiktok.com/..."
                      className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={formData.videoLink}
                      onChange={e => setFormData({...formData, videoLink: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Paste a link to automatically fetch views later.</p>
                </div>

              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Avg Views</label>
                  <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.avgViews} onChange={e => setFormData({...formData, avgViews: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Avg Likes</label>
                  <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.avgLikes} onChange={e => setFormData({...formData, avgLikes: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Avg Cmts</label>
                  <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" value={formData.avgComments} onChange={e => setFormData({...formData, avgComments: Number(e.target.value)})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg shadow-purple-900/20 transition-all">Save Creator</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Sync Modal */}
      {isManualSyncOpen && manualSyncData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
             <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-bold text-white">Manual Verification</h3>
                </div>
                <button onClick={() => setIsManualSyncOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
             </div>
             
             <div className="p-6">
                <p className="text-gray-300 text-sm mb-4">
                   AI could not verify the exact numbers. Please verify manually.
                </p>
                
                <div className="bg-gray-900 p-3 rounded-lg mb-6 border border-gray-700 flex items-center justify-between">
                   <span className="text-blue-400 text-sm truncate max-w-[250px]">{manualSyncData.url}</span>
                   <a 
                     href={manualSyncData.url} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
                   >
                     Open Link
                   </a>
                </div>

                <form onSubmit={handleManualSyncSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Views</label>
                       <input 
                         type="number" 
                         className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-center"
                         value={manualSyncData.views}
                         onChange={e => setManualSyncData({...manualSyncData, views: Number(e.target.value)})}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Likes</label>
                       <input 
                         type="number" 
                         className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-center"
                         value={manualSyncData.likes}
                         onChange={e => setManualSyncData({...manualSyncData, likes: Number(e.target.value)})}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Comments</label>
                       <input 
                         type="number" 
                         className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-center"
                         value={manualSyncData.comments}
                         onChange={e => setManualSyncData({...manualSyncData, comments: Number(e.target.value)})}
                       />
                     </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" /> Save Data
                  </button>
                </form>
             </div>
          </div>
        </div>
      )}

       {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Creator?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete this creator? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => { setDeleteId(null); setDeleteName(null); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-900/20"
                >
                  Yes, Delete
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CreatorList;