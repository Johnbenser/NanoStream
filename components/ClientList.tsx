
import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, LayoutGrid, Table as TableIcon,
  AlertTriangle, ExternalLink, X, Cloud, Video, Type, Calendar, 
  FileSpreadsheet, DollarSign, Clock, PlayCircle, Building2, Globe, Link as LinkIcon
} from 'lucide-react';
import { Creator, CreatorFormData, VideoUpload } from '../types';
import { saveClient, deleteClient } from '../services/storageService';

interface ClientListProps {
  clients: Creator[];
  onRefresh?: () => void;
  currentUser?: string;
}

// Reusing existing categories logic or defining client specific industries
const CLIENT_CATEGORIES = ['E-commerce', 'Beauty', 'Tech', 'Fashion', 'Home', 'Other'];

const ClientList: React.FC<ClientListProps> = ({ clients, currentUser }) => {
  // Main View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Client CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '', username: '', niche: '', productCategory: 'E-commerce',
    email: '', phone: '', videoLink: '', tiktokLink: '', avgViews: 0, avgLikes: 0, 
    avgComments: 0, avgShares: 0, videosCount: 0, uploads: []
  });

  // Video Library / Manager State
  const [libraryClient, setLibraryClient] = useState<Creator | null>(null);
  const [videoFormData, setVideoFormData] = useState<Partial<VideoUpload>>({
    title: '', url: '', product: '', productName: '',
    views: 0, likes: 0, comments: 0, shares: 0,
    newFollowers: 0, avgWatchTime: '', watchedFullVideo: 0, itemsSold: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // --- EXPORT FUNCTIONALITY ---
  
  // Shared Table Styles
  const getTableStyle = () => `
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; }
      .header-container { padding: 20px 0; text-align: left; border-bottom: 3px solid #1e40af; margin-bottom: 20px; }
      .brand-text { color: #1e3a8a; font-size: 26px; font-weight: 900; margin: 0; text-transform: uppercase; }
      .report-title { color: #3b82f6; font-size: 16px; font-weight: bold; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
      .meta-data { color: #64748b; font-size: 11px; margin-top: 10px; font-family: monospace; }
      
      .section-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 30px; margin-bottom: 10px; border-left: 5px solid #3b82f6; padding-left: 10px; }
      
      table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; margin-bottom: 20px; }
      th { background-color: #1e40af; color: white; border: 1px solid #1e3a8a; padding: 12px 10px; text-align: left; font-weight: bold; font-size: 11px; white-space: nowrap; }
      td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: middle; color: #334155; font-size: 11px; }
      tr:nth-child(even) { background-color: #f8fafc; }
      
      .num { text-align: right; font-family: 'Courier New', monospace; font-weight: bold; }
      .status-good { color: #16a34a; font-weight: bold; }
      .status-neutral { color: #d97706; }
    </style>
  `;

  const handleExportExcel = () => {
    const username = currentUser ? currentUser.split('@')[0] : 'Unknown User';
    const generateDate = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Client Summary Rows (Removed Name, Account, Category)
    const summaryRows = clients.map(c => `
      <tr>
        <td>${c.niche}</td>
        <td class="num">${c.videosCount}</td>
        <td class="num">${c.avgViews.toLocaleString()}</td>
        <td class="num">${c.avgLikes.toLocaleString()}</td>
        <td class="num">${c.avgComments.toLocaleString()}</td>
        <td class="num">${c.avgShares.toLocaleString()}</td>
        <td class="num">${c.avgViews > 0 ? ((c.avgLikes + c.avgComments + c.avgShares) / c.avgViews * 100).toFixed(2) : '0.00'}%</td>
      </tr>
    `).join('');

    // 2. Detailed Video Logs Rows
    let videoRows = '';
    clients.forEach(client => {
      if (client.uploads && client.uploads.length > 0) {
        client.uploads.forEach(v => {
          videoRows += `
            <tr>
              <td>${v.dateAdded ? new Date(v.dateAdded).toLocaleDateString() : '-'}</td>
              <td style="font-weight:bold;">${client.name}</td>
              <td>${v.title}</td>
              <td>${v.product}</td>
              <td>${v.productName || '-'}</td>
              <td class="num">${v.views.toLocaleString()}</td>
              <td class="num">${v.likes.toLocaleString()}</td>
              <td class="num">${v.comments.toLocaleString()}</td>
              <td class="num status-good">${v.itemsSold || 0}</td>
              <td class="num">${v.avgWatchTime || '-'}</td>
              <td class="num">${v.watchedFullVideo ? v.watchedFullVideo + '%' : '-'}</td>
              <td><a href="${v.url}">Link</a></td>
            </tr>
          `;
        });
      }
    });

    if (!videoRows) {
        videoRows = '<tr><td colspan="12" style="text-align:center; color:#94a3b8; padding: 20px;">No video data logged yet.</td></tr>';
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        ${getTableStyle()}
      </head>
      <body>
        <div class="header-container">
          <div class="brand-text">Global Media Live</div>
          <div class="report-title">Client Brand Performance Report (All)</div>
          <div class="meta-data">
            Generated by: ${username} | Date: ${generateDate}
            <br>Generated from https://nano-stream.vercel.app/
          </div>
        </div>
        
        <br/>

        <div class="section-title">Client Summary</div>
        <table>
          <thead>
            <tr>
              <th>Industry</th>
              <th style="text-align:right">Total Videos</th>
              <th style="text-align:right">Total Views</th>
              <th style="text-align:right">Total Likes</th>
              <th style="text-align:right">Total Comments</th>
              <th style="text-align:right">Total Shares</th>
              <th style="text-align:right">Eng. Rate</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
        </table>

        <br/><br/>

        <div class="section-title">Detailed Video Logs</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Video Title</th>
              <th>Category</th>
              <th>Product Name</th>
              <th style="text-align:right">Views</th>
              <th style="text-align:right">Likes</th>
              <th style="text-align:right">Comments</th>
              <th style="text-align:right">Items Sold</th>
              <th style="text-align:right">Avg Watch</th>
              <th style="text-align:right">Full Watch %</th>
              <th>Video Link</th>
            </tr>
          </thead>
          <tbody>
            ${videoRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GML_All_Clients_Report_${dateStr}.xls`;
    link.click();
  };

  // --- SINGLE CLIENT EXPORT ---
  const handleExportSingleClientReport = (client: Creator) => {
    const username = currentUser ? currentUser.split('@')[0] : 'Unknown User';
    const generateDate = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];

    // Summary Row for just this client (Removed Name, Account, Category)
    const summaryRow = `
      <tr>
        <td>${client.niche}</td>
        <td class="num">${client.videosCount}</td>
        <td class="num">${client.avgViews.toLocaleString()}</td>
        <td class="num">${client.avgLikes.toLocaleString()}</td>
        <td class="num">${client.avgComments.toLocaleString()}</td>
        <td class="num">${client.avgShares.toLocaleString()}</td>
        <td class="num">${client.avgViews > 0 ? ((client.avgLikes + client.avgComments + client.avgShares) / client.avgViews * 100).toFixed(2) : '0.00'}%</td>
      </tr>
    `;

    // Detailed Logs for just this client
    let videoRows = '';
    if (client.uploads && client.uploads.length > 0) {
        client.uploads.forEach(v => {
          videoRows += `
            <tr>
              <td>${v.dateAdded ? new Date(v.dateAdded).toLocaleDateString() : '-'}</td>
              <td>${v.title}</td>
              <td>${v.product}</td>
              <td>${v.productName || '-'}</td>
              <td class="num">${v.views.toLocaleString()}</td>
              <td class="num">${v.likes.toLocaleString()}</td>
              <td class="num">${v.comments.toLocaleString()}</td>
              <td class="num status-good">${v.itemsSold || 0}</td>
              <td class="num">${v.avgWatchTime || '-'}</td>
              <td class="num">${v.watchedFullVideo ? v.watchedFullVideo + '%' : '-'}</td>
              <td><a href="${v.url}">Link</a></td>
            </tr>
          `;
        });
    } else {
        videoRows = '<tr><td colspan="11" style="text-align:center; color:#94a3b8; padding: 20px;">No video data logged for this client yet.</td></tr>';
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        ${getTableStyle()}
      </head>
      <body>
        <div class="header-container">
          <div class="brand-text">Global Media Live</div>
          <div class="report-title">Client Exclusive Report: ${client.name}</div>
          <div class="meta-data">
            Generated by: ${username} | Date: ${generateDate}
            <br>Generated from https://nano-stream.vercel.app/
          </div>
        </div>
        
        <br/>

        <div class="section-title">Performance Summary</div>
        <table>
          <thead>
            <tr>
              <th>Industry</th>
              <th style="text-align:right">Total Videos</th>
              <th style="text-align:right">Total Views</th>
              <th style="text-align:right">Total Likes</th>
              <th style="text-align:right">Total Comments</th>
              <th style="text-align:right">Total Shares</th>
              <th style="text-align:right">Eng. Rate</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRow}
          </tbody>
        </table>

        <br/><br/>

        <div class="section-title">Video Upload Log</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Video Title</th>
              <th>Category</th>
              <th>Product Name</th>
              <th style="text-align:right">Views</th>
              <th style="text-align:right">Likes</th>
              <th style="text-align:right">Comments</th>
              <th style="text-align:right">Items Sold</th>
              <th style="text-align:right">Avg Watch</th>
              <th style="text-align:right">Full Watch %</th>
              <th>Video Link</th>
            </tr>
          </thead>
          <tbody>
            ${videoRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GML_${client.name.replace(/\s+/g, '_')}_Report_${dateStr}.xls`;
    link.click();
  };

  // --- CLIENT ACTIONS ---

  const handleOpenModal = (client?: Creator) => {
    if (client) {
      setEditingId(client.id);
      setFormData({
        name: client.name,
        username: client.username || '',
        niche: client.niche,
        productCategory: client.productCategory || 'E-commerce',
        email: client.email || '',
        phone: client.phone || '',
        videoLink: client.videoLink || '',
        tiktokLink: client.tiktokLink || '',
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
        name: '', username: '', niche: '', productCategory: 'E-commerce',
        email: '', phone: '', videoLink: '', tiktokLink: '', uploads: [],
        avgViews: 0, avgLikes: 0, avgComments: 0, avgShares: 0, videosCount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveClient(formData, editingId || undefined);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (deleteId && deleteName) {
      await deleteClient(deleteId, deleteName);
      setDeleteId(null);
      setDeleteName(null);
    }
  };

  // --- VIDEO LIBRARY ACTIONS ---

  const openLibrary = (client: Creator) => {
    setLibraryClient(client);
    setIsVideoFormOpen(false); // Reset form state
  };

  const openVideoForm = (video?: VideoUpload) => {
    if (video) {
        setEditingVideoId(video.id);
        setVideoFormData({ 
            ...video,
            dateAdded: video.dateAdded ? video.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]
        });
    } else {
        setEditingVideoId(null);
        setVideoFormData({ 
            title: '', url: '', product: '', productName: '',
            views: 0, likes: 0, comments: 0, shares: 0,
            newFollowers: 0, avgWatchTime: '', watchedFullVideo: 0, itemsSold: 0,
            dateAdded: new Date().toISOString().split('T')[0]
        });
    }
    setIsVideoFormOpen(true);
  };

  const saveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryClient) return;

    let updatedUploads = [...(libraryClient.uploads || [])];
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
            product: videoFormData.product || 'General',
            productName: videoFormData.productName,
            views: videoFormData.views || 0,
            likes: videoFormData.likes || 0,
            comments: videoFormData.comments || 0,
            shares: videoFormData.shares || 0,
            newFollowers: videoFormData.newFollowers,
            avgWatchTime: videoFormData.avgWatchTime,
            watchedFullVideo: videoFormData.watchedFullVideo,
            itemsSold: videoFormData.itemsSold
        };
        updatedUploads.push(newVideo);
    }

    const count = updatedUploads.length;
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedClient: CreatorFormData = {
        name: libraryClient.name,
        username: libraryClient.username || '',
        niche: libraryClient.niche,
        productCategory: libraryClient.productCategory || 'E-commerce',
        email: libraryClient.email || '',
        phone: libraryClient.phone || '',
        videoLink: count > 0 ? updatedUploads[count-1].url : '',
        tiktokLink: libraryClient.tiktokLink || '', // Ensure no undefined value
        uploads: updatedUploads,
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: count
    };

    await saveClient(updatedClient, libraryClient.id);
    setLibraryClient({ ...libraryClient, ...updatedClient } as Creator);
    setIsVideoFormOpen(false);
  };

  const deleteVideo = async (videoId: string) => {
    if (!libraryClient || !window.confirm("Delete this video log?")) return;

    const updatedUploads = (libraryClient.uploads || []).filter(u => u.id !== videoId);
    
    // Recalc Stats
    const count = updatedUploads.length;
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedClient = {
        ...libraryClient,
        uploads: updatedUploads,
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: count
    };

    // Cast to form data for saving
    const formDataToSave: CreatorFormData = {
        name: updatedClient.name,
        username: updatedClient.username || '',
        niche: updatedClient.niche,
        productCategory: updatedClient.productCategory || 'E-commerce',
        email: updatedClient.email || '',
        phone: updatedClient.phone || '',
        videoLink: updatedClient.videoLink || '',
        tiktokLink: updatedClient.tiktokLink || '', // Ensure no undefined value
        uploads: updatedClient.uploads,
        avgViews: updatedClient.avgViews,
        avgLikes: updatedClient.avgLikes,
        avgComments: updatedClient.avgComments,
        avgShares: updatedClient.avgShares,
        videosCount: updatedClient.videosCount
    };

    await saveClient(formDataToSave, libraryClient.id);
    setLibraryClient(updatedClient as Creator);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-2 text-blue-200 text-sm">
        <Cloud className="w-4 h-4" />
        Client Data is securely synced to the Cloud Database.
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search clients..."
            className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Grid</span>
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <TableIcon className="w-4 h-4" /> <span className="hidden sm:inline">Spreadsheet</span>
            </button>
          </div>

          <div className="w-px h-8 bg-gray-700 mx-2 hidden xl:block"></div>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export all reports
          </button>
          
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Plus className="w-4 h-4" /> Add Client Brand
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No client brands found.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{client.name}</h3>
                  
                  {/* TikTok Link Display in Grid */}
                  {client.tiktokLink && (
                    <a 
                      href={client.tiktokLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 mt-1 mb-2 hover:underline w-fit"
                    >
                      <ExternalLink className="w-3 h-3" /> Visit TikTok
                    </a>
                  )}

                  <div className="flex gap-2 mt-1">
                    <span className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                      {client.niche}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDeleteClick(client.id, client.name, e)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 mb-4">
                 <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Total Videos</span>
                    <span className="text-white font-bold">{client.videosCount}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Views</span>
                    <span className="text-white font-bold">{client.avgViews.toLocaleString()}</span>
                 </div>
              </div>

              <button 
                onClick={() => openLibrary(client)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all text-sm font-bold flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" /> Manage AI Videos
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-fade-in shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900 text-gray-200 uppercase font-medium border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">TikTok Link</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4 text-right">Total AI Videos</th>
                  <th className="px-6 py-4 text-right">Total Views</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-750/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{client.name}</td>
                    <td className="px-6 py-4">
                      {client.tiktokLink ? (
                        <a href={client.tiktokLink} target="_blank" rel="noreferrer" className="text-pink-400 hover:text-pink-300">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-6 py-4"><span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">{client.niche}</span></td>
                    <td className="px-6 py-4 text-right">{client.videosCount}</td>
                    <td className="px-6 py-4 text-right text-white font-mono">{client.avgViews.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-3">
                       <button onClick={() => openLibrary(client)} className="text-blue-400 hover:text-blue-300 font-medium text-xs border border-blue-500/30 px-3 py-1 rounded hover:bg-blue-900/20">Manage Videos</button>
                       <button onClick={() => handleOpenModal(client)}><Edit2 className="w-4 h-4 hover:text-white" /></button>
                       <button onClick={(e) => handleDeleteClick(client.id, client.name, e)}><Trash2 className="w-4 h-4 hover:text-red-400" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIDEO LIBRARY MODAL */}
      {libraryClient && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-6xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               {/* Header */}
               <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/90">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                         <Building2 className="w-5 h-5 text-blue-400" /> {libraryClient.name}
                         <span className="text-gray-500 font-normal">/ AI Video Workspace</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                        onClick={() => handleExportSingleClientReport(libraryClient)}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-green-900/20"
                     >
                        <FileSpreadsheet className="w-4 h-4" /> Export Report
                     </button>
                     <button 
                        onClick={() => openVideoForm()} 
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20"
                     >
                        <Plus className="w-4 h-4" /> Log Video
                     </button>
                     <button onClick={() => setLibraryClient(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                  </div>
               </div>
               
               <div className="overflow-y-auto flex-1 p-0 bg-gray-900">
                  {/* Internal Form for Add/Edit */}
                  {isVideoFormOpen && (
                     <div className="p-6 bg-gray-800 border-b border-gray-700 animate-in slide-in-from-top-4">
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                            {editingVideoId ? <Edit2 className="w-4 h-4 text-purple-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                            {editingVideoId ? 'Edit AI Video Stats' : 'Log New AI Video'}
                        </h4>
                        <form onSubmit={saveVideo} className="space-y-4">
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Video Title */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Video Title</label>
                                    <div className="relative">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="e.g. Client Promo V1" 
                                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={videoFormData.title}
                                            onChange={e => setVideoFormData({...videoFormData, title: e.target.value})}
                                        />
                                    </div>
                                </div>
                                {/* Upload Date */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Publish Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                        <input 
                                            required 
                                            type="date" 
                                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none [color-scheme:dark]"
                                            value={videoFormData.dateAdded}
                                            onChange={e => setVideoFormData({...videoFormData, dateAdded: e.target.value})}
                                        />
                                    </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Video Link</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://..." 
                                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={videoFormData.url}
                                        onChange={e => setVideoFormData({...videoFormData, url: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Product Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Summer Collection Item A"
                                        className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={videoFormData.productName || ''}
                                        onChange={e => setVideoFormData({...videoFormData, productName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Category</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Promo / Awareness"
                                        className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={videoFormData.product || ''}
                                        onChange={e => setVideoFormData({...videoFormData, product: e.target.value})}
                                    />
                                </div>
                             </div>

                             {/* Stats Inputs */}
                             <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                                <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><PlayCircle className="w-3 h-3"/> Engagement Metrics</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Views</label>
                                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.views} onChange={e => setVideoFormData({...videoFormData, views: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Likes</label>
                                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.likes} onChange={e => setVideoFormData({...videoFormData, likes: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Comments</label>
                                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.comments} onChange={e => setVideoFormData({...videoFormData, comments: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Shares</label>
                                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.shares} onChange={e => setVideoFormData({...videoFormData, shares: Number(e.target.value)})} />
                                    </div>
                                </div>
                             </div>

                             {/* Detailed Stats */}
                             <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/20">
                                <h5 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><DollarSign className="w-3 h-3"/> Conversion & Retention</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">New Followers</label>
                                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.newFollowers} onChange={e => setVideoFormData({...videoFormData, newFollowers: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Avg Watch Time</label>
                                        <input type="text" placeholder="0:00" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.avgWatchTime} onChange={e => setVideoFormData({...videoFormData, avgWatchTime: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Full Watch %</label>
                                        <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm" value={videoFormData.watchedFullVideo} onChange={e => setVideoFormData({...videoFormData, watchedFullVideo: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-green-500 uppercase">Items Sold</label>
                                        <input type="number" className="w-full bg-gray-800 border border-green-900/50 text-white p-2 rounded text-sm focus:border-green-500" value={videoFormData.itemsSold} onChange={e => setVideoFormData({...videoFormData, itemsSold: Number(e.target.value)})} />
                                    </div>
                                </div>
                             </div>

                             <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsVideoFormOpen(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg">Save Video Data</button>
                             </div>
                        </form>
                     </div>
                  )}

                  {/* Video List */}
                  {(!libraryClient.uploads || libraryClient.uploads.length === 0) ? (
                     <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Video className="w-16 h-16 mb-4 opacity-20" />
                        <p>No videos logged for this client yet.</p>
                     </div>
                  ) : (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-800 text-gray-400 uppercase font-medium sticky top-0 z-10 text-xs">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Video / Product</th>
                                    <th className="px-6 py-3 text-right">Views</th>
                                    <th className="px-6 py-3 text-right">Sold</th>
                                    <th className="px-6 py-3 text-right">Watch Time</th>
                                    <th className="px-6 py-3 text-center">Link</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {[...libraryClient.uploads].reverse().map((upload) => (
                                    <tr key={upload.id} className="hover:bg-gray-800/50 bg-gray-900">
                                        <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                                            {upload.dateAdded ? new Date(upload.dateAdded).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-white font-medium">{upload.title || "Untitled"}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                {upload.product && <span className="bg-gray-800 px-1.5 rounded">{upload.product}</span>}
                                                {upload.productName && <span>{upload.productName}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-gray-300">{upload.views.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right font-mono text-green-400 font-bold">{upload.itemsSold || '-'}</td>
                                        <td className="px-6 py-3 text-right font-mono text-gray-400">
                                            {upload.avgWatchTime ? <span className="flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {upload.avgWatchTime}</span> : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {upload.url && <a href={upload.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-white"><ExternalLink className="w-4 h-4 mx-auto"/></a>}
                                        </td>
                                        <td className="px-6 py-3 text-center flex items-center justify-center gap-3">
                                            <button onClick={() => openVideoForm(upload)} className="text-gray-500 hover:text-blue-400"><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={() => deleteVideo(upload.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                  )}
               </div>
           </div>
         </div>
      )}

      {/* Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Client Details' : 'Add New Client Brand'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Client Name</label>
                  <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">TikTok Profile Link</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                        type="url" 
                        placeholder="https://tiktok.com/@..." 
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={formData.tiktokLink || ''} 
                        onChange={e => setFormData({...formData, tiktokLink: e.target.value})} 
                    />
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Industry / Niche</label>
                  <select className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})}>
                      <option value="">Select Industry...</option>
                      {CLIENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Contact Email</label>
                  <input type="email" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Phone</label>
                  <input type="tel" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-all">Save Client</button>
              </div>
            </form>
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
              <h3 className="text-lg font-bold text-white mb-2">Delete Client?</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete <strong>{deleteName}</strong>? This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setDeleteId(null); setDeleteName(null); }} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-900/20 transition-all">Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;
