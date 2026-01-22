import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, LayoutGrid, Table as TableIcon,
  Video, ExternalLink, FileSpreadsheet,
  Brain, Loader2, RefreshCw, X, Building2,
  Users, Activity, DollarSign
} from 'lucide-react';
import { Creator, CreatorFormData, VideoUpload, AnalysisResult } from '../types';
import { saveClient, deleteClient } from '../services/storageService';
import { analyzeClientData } from '../services/geminiService';
import { 
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';

interface ClientListProps {
  clients: Creator[];
  currentUser?: string;
}

const ClientList: React.FC<ClientListProps> = ({ clients, currentUser }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Analysis State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '', username: '', niche: '', productCategory: 'Other',
    email: '', phone: '', videoLink: '', avgViews: 0, avgLikes: 0, 
    avgComments: 0, avgShares: 0, videosCount: 0, uploads: []
  });

  // Manage Video Modal State
  const [manageClient, setManageClient] = useState<Creator | null>(null);
  const [videoFormData, setVideoFormData] = useState<Partial<VideoUpload>>({
    title: '', url: '', product: 'Other', productName: '',
    views: 0, likes: 0, comments: 0, shares: 0, itemsSold: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // --- ACTIONS ---

  const handleOpenModal = (client?: Creator) => {
    if (client) {
      setEditingId(client.id);
      setFormData({
        name: client.name,
        username: client.username || '',
        niche: client.niche,
        productCategory: client.productCategory || 'Other',
        email: client.email,
        phone: client.phone,
        videoLink: client.videoLink || '',
        uploads: client.uploads || [],
        avgViews: client.avgViews,
        avgLikes: client.avgLikes,
        avgComments: client.avgComments,
        avgShares: client.avgShares || 0,
        videosCount: client.videosCount
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', username: '', niche: '', productCategory: 'Other',
        email: '', phone: '', videoLink: '', uploads: [],
        avgViews: 0, avgLikes: 0, avgComments: 0, avgShares: 0, videosCount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveClient(formData, editingId || undefined);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save client.");
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete client "${name}"?`)) {
        await deleteClient(id, name);
    }
  };

  const handleAnalyze = async () => {
    if (clients.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
        const result = await analyzeClientData(clients);
        setAnalysis(result);
    } catch (error: any) {
        setAnalysisError("Failed to generate AI insights.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- VIDEO MANAGEMENT ---
  const openManageModal = (client: Creator) => {
      setManageClient(client);
      setIsVideoFormOpen(false);
  };

  const saveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageClient) return;

    let updatedUploads = [...(manageClient.uploads || [])];
    const finalDate = videoFormData.dateAdded 
        ? new Date(videoFormData.dateAdded).toISOString() 
        : new Date().toISOString();

    if (editingVideoId) {
        updatedUploads = updatedUploads.map(u => 
            u.id === editingVideoId ? { 
                ...u, 
                ...videoFormData as VideoUpload,
                dateAdded: finalDate
            } : u
        );
    } else {
        const newVideo: VideoUpload = {
            id: Date.now().toString(),
            dateAdded: finalDate,
            title: videoFormData.title || 'Untitled Video',
            url: videoFormData.url || '',
            product: videoFormData.product || 'Other',
            productName: videoFormData.productName,
            views: videoFormData.views || 0,
            likes: videoFormData.likes || 0,
            comments: videoFormData.comments || 0,
            shares: videoFormData.shares || 0,
            itemsSold: videoFormData.itemsSold || 0
        };
        updatedUploads.push(newVideo);
    }

    // Recalculate totals
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedClientData: CreatorFormData = {
        name: manageClient.name,
        username: manageClient.username,
        niche: manageClient.niche,
        productCategory: manageClient.productCategory,
        email: manageClient.email,
        phone: manageClient.phone,
        videoLink: manageClient.videoLink,
        uploads: updatedUploads,
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: updatedUploads.length
    };

    await saveClient(updatedClientData, manageClient.id);
    setManageClient({ ...manageClient, ...updatedClientData } as Creator);
    setIsVideoFormOpen(false);
  };

  const deleteVideo = async (videoId: string) => {
    if (!manageClient || !window.confirm("Delete this video?")) return;
    
    const updatedUploads = (manageClient.uploads || []).filter(u => u.id !== videoId);
    // Recalculate totals
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedClientData: CreatorFormData = {
        name: manageClient.name,
        username: manageClient.username,
        niche: manageClient.niche,
        productCategory: manageClient.productCategory,
        email: manageClient.email,
        phone: manageClient.phone,
        videoLink: manageClient.videoLink,
        uploads: updatedUploads,
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: updatedUploads.length
    };

    await saveClient(updatedClientData, manageClient.id);
    setManageClient({ ...manageClient, ...updatedClientData } as Creator);
  };

  const openVideoForm = (video?: VideoUpload) => {
    if (video) {
        setEditingVideoId(video.id);
        setVideoFormData({ ...video, dateAdded: video.dateAdded?.split('T')[0] });
    } else {
        setEditingVideoId(null);
        setVideoFormData({ 
            title: '', url: '', product: 'Other', productName: '',
            views: 0, likes: 0, comments: 0, shares: 0, itemsSold: 0,
            dateAdded: new Date().toISOString().split('T')[0]
        });
    }
    setIsVideoFormOpen(true);
  };

  // --- EXPORT ---
  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    
    let videoRows = '';
    clients.forEach(client => {
      if (client.uploads && client.uploads.length > 0) {
        client.uploads.forEach(v => {
          // Escape URL amp characters for Excel HTML compatibility
          // Double encode slashes %2F to %252F so Excel decodes to %2F, preserving Firebase path structure
          const safeUrl = v.url ? v.url.replace(/&/g, '&amp;').replace(/%2F/g, '%252F') : '';
          
          videoRows += `
            <tr>
              <td>${client.name}</td>
              <td>${v.dateAdded ? new Date(v.dateAdded).toLocaleDateString() : '-'}</td>
              <td>${v.title}</td>
              <td>${v.product}</td>
              <td style="text-align:right">${v.views}</td>
              <td style="text-align:right">${v.itemsSold || 0}</td>
              <td><a href="${safeUrl}">Watch</a></td>
            </tr>`;
        });
      }
    });

    const htmlContent = `
      <html>
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      </head>
      <body>
        <h3>Client Video Performance Report - ${dateStr}</h3>
        <table border="1">
          <thead>
            <tr style="background-color:#eee; font-weight:bold;">
              <th>Client Name</th>
              <th>Date</th>
              <th>Video Title</th>
              <th>Category</th>
              <th>Views</th>
              <th>Items Sold</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>${videoRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Client_Report_${dateStr}.xls`;
    link.click();
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* Header / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Active Clients</h3>
                </div>
                <p className="text-2xl font-bold text-white">{clients.length}</p>
             </div>
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Total Client Views</h3>
                </div>
                <p className="text-2xl font-bold text-white">
                    {clients.reduce((sum, c) => sum + c.avgViews, 0).toLocaleString()}
                </p>
             </div>
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Total Sales Tracked</h3>
                </div>
                <p className="text-2xl font-bold text-white">
                    {clients.reduce((sum, c) => sum + (c.uploads?.reduce((s, u) => s + (u.itemsSold || 0), 0) || 0), 0).toLocaleString()}
                </p>
             </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Client Portfolio Insights</h2>
                </div>
                {!isAnalyzing && (
                    <button 
                        onClick={handleAnalyze} 
                        className="text-sm bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" /> {analysis ? 'Regenerate Analysis' : 'Generate Analysis'}
                    </button>
                )}
            </div>

            {isAnalyzing ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <span className="ml-2 text-gray-400">Analyzing client performance...</span>
                </div>
            ) : analysis ? (
                <div className="space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-white/5">
                        <p className="text-gray-200 text-sm leading-relaxed">{analysis.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-lg">
                            <h3 className="text-green-400 font-bold mb-2 text-sm">Top Performers</h3>
                            <ul className="space-y-1">{analysis.topPerformers.map((item, i) => <li key={i} className="text-xs text-gray-300">• {item}</li>)}</ul>
                        </div>
                        <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-lg">
                            <h3 className="text-purple-400 font-bold mb-2 text-sm">Growth Opportunities</h3>
                            <ul className="space-y-1">{analysis.growthOpportunities.map((item, i) => <li key={i} className="text-xs text-gray-300">• {item}</li>)}</ul>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500 text-sm py-4">Generate analysis to see AI insights about client performance.</p>
            )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search clients..."
                    className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded ${viewMode === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <TableIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    <FileSpreadsheet className="w-4 h-4" /> Report
                </button>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    <Plus className="w-4 h-4" /> Add Client
                </button>
            </div>
        </div>

        {/* List Content */}
        {viewMode === 'table' ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-4">Client Brand</th>
                                <th className="px-6 py-4">Industry / Niche</th>
                                <th className="px-6 py-4 text-center">Videos Tracked</th>
                                <th className="px-6 py-4 text-right">Total Views</th>
                                <th className="px-6 py-4 text-right">Items Sold</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-gray-750/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white">{client.name}</div>
                                        <div className="text-xs text-gray-500">{client.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">{client.niche}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => openManageModal(client)} className="text-blue-400 hover:underline font-mono">
                                            {client.videosCount || (client.uploads?.length || 0)}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-300">{client.avgViews.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono text-green-400">
                                        {client.uploads?.reduce((s, u) => s + (u.itemsSold || 0), 0) || 0}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openManageModal(client)} className="text-blue-400 hover:text-blue-300 p-1"><Video className="w-4 h-4"/></button>
                                            <button onClick={() => handleOpenModal(client)} className="text-gray-400 hover:text-white p-1"><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteClick(client.id, client.name)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                    <div key={client.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{client.name}</h3>
                                <p className="text-xs text-gray-500">{client.niche}</p>
                            </div>
                            <button onClick={() => openManageModal(client)} className="bg-blue-900/30 text-blue-400 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                                <Video className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div className="bg-gray-900/50 p-3 rounded-lg">
                                <div className="text-gray-500 text-xs uppercase mb-1">Total Views</div>
                                <div className="text-white font-mono font-bold">{client.avgViews.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-900/50 p-3 rounded-lg">
                                <div className="text-gray-500 text-xs uppercase mb-1">Items Sold</div>
                                <div className="text-green-400 font-mono font-bold">
                                    {client.uploads?.reduce((s, u) => s + (u.itemsSold || 0), 0) || 0}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                             <button onClick={() => handleOpenModal(client)} className="text-gray-400 hover:text-white text-sm">Edit Details</button>
                             <button onClick={() => handleDeleteClick(client.id, client.name)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* MODAL: ADD/EDIT CLIENT */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Client' : 'Add New Client'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input required placeholder="Client / Brand Name" className="bg-gray-900 border border-gray-700 text-white rounded p-3 w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <input required placeholder="Industry / Niche" className="bg-gray-900 border border-gray-700 text-white rounded p-3 w-full" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
                        </div>
                        <input required placeholder="Contact Email" type="email" className="bg-gray-900 border border-gray-700 text-white rounded p-3 w-full" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input placeholder="Contact Phone" className="bg-gray-900 border border-gray-700 text-white rounded p-3 w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">Cancel</button>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold">Save Client</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL: MANAGE VIDEOS */}
        {manageClient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-gray-800 rounded-xl w-full max-w-4xl border border-gray-700 shadow-2xl h-[80vh] flex flex-col">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Video className="w-5 h-5 text-blue-400"/> Video Library: {manageClient.name}
                            </h3>
                        </div>
                        <button onClick={() => setManageClient(null)}><X className="text-gray-400 hover:text-white"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                        {isVideoFormOpen ? (
                            <form onSubmit={saveVideo} className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
                                <h4 className="font-bold text-white">{editingVideoId ? 'Edit Video' : 'Add New Video'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required placeholder="Video Title" className="bg-gray-900 border border-gray-700 text-white rounded p-2" value={videoFormData.title} onChange={e => setVideoFormData({...videoFormData, title: e.target.value})} />
                                    <input required type="date" className="bg-gray-900 border border-gray-700 text-white rounded p-2 [color-scheme:dark]" value={videoFormData.dateAdded} onChange={e => setVideoFormData({...videoFormData, dateAdded: e.target.value})} />
                                </div>
                                <input placeholder="Video URL" className="bg-gray-900 border border-gray-700 text-white rounded p-2 w-full" value={videoFormData.url} onChange={e => setVideoFormData({...videoFormData, url: e.target.value})} />
                                
                                <div className="grid grid-cols-4 gap-2">
                                    <input type="number" placeholder="Views" className="bg-gray-900 border border-gray-700 text-white rounded p-2" value={videoFormData.views} onChange={e => setVideoFormData({...videoFormData, views: Number(e.target.value)})} />
                                    <input type="number" placeholder="Likes" className="bg-gray-900 border border-gray-700 text-white rounded p-2" value={videoFormData.likes} onChange={e => setVideoFormData({...videoFormData, likes: Number(e.target.value)})} />
                                    <input type="number" placeholder="Shares" className="bg-gray-900 border border-gray-700 text-white rounded p-2" value={videoFormData.shares} onChange={e => setVideoFormData({...videoFormData, shares: Number(e.target.value)})} />
                                    <input type="number" placeholder="Items Sold" className="bg-gray-900 border border-green-900 text-green-100 rounded p-2" value={videoFormData.itemsSold} onChange={e => setVideoFormData({...videoFormData, itemsSold: Number(e.target.value)})} />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsVideoFormOpen(false)} className="text-gray-400">Cancel</button>
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Save</button>
                                </div>
                            </form>
                        ) : (
                             <div className="flex justify-end mb-4">
                                <button onClick={() => openVideoForm()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Add Video
                                </button>
                             </div>
                        )}

                        <table className="w-full text-left text-sm mt-4">
                            <thead className="text-gray-500 border-b border-gray-700">
                                <tr>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Title</th>
                                    <th className="py-2 text-right">Views</th>
                                    <th className="py-2 text-right">Sold</th>
                                    <th className="py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {manageClient.uploads?.map(video => (
                                    <tr key={video.id}>
                                        <td className="py-3 text-gray-400">{video.dateAdded?.split('T')[0]}</td>
                                        <td className="py-3 text-white">{video.title}</td>
                                        <td className="py-3 text-right text-gray-300">{video.views.toLocaleString()}</td>
                                        <td className="py-3 text-right text-green-400 font-bold">{video.itemsSold}</td>
                                        <td className="py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openVideoForm(video)} className="text-gray-500 hover:text-white"><Edit2 className="w-4 h-4"/></button>
                                                <button onClick={() => deleteVideo(video.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ClientList;
