
import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, LayoutGrid, Table as TableIcon,
  AlertTriangle, ExternalLink, Save, X, FileText, 
  Cloud, User as UserIcon, Tag, PlayCircle, Share2, Heart, Video, Type, Clipboard, Calendar, FileSpreadsheet
} from 'lucide-react';
import { Creator, CreatorFormData, VideoUpload } from '../types';
import { saveCreator, deleteCreator } from '../services/storageService';

interface CreatorListProps {
  creators: Creator[];
  onRefresh?: () => void;
  currentUser?: string;
}

const PRODUCT_CATEGORIES = ['Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];

const CreatorList: React.FC<CreatorListProps> = ({ creators, currentUser }) => {
  // Main View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Creator CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '', username: '', niche: '', productCategory: 'Maikalian',
    email: '', phone: '', videoLink: '', avgViews: 0, avgLikes: 0, 
    avgComments: 0, avgShares: 0, videosCount: 0, uploads: []
  });

  // Video Library / Manager State
  const [libraryCreator, setLibraryCreator] = useState<Creator | null>(null);
  const [videoFormData, setVideoFormData] = useState<Partial<VideoUpload>>({
    title: '', url: '', product: 'Maikalian', views: 0, likes: 0, comments: 0, shares: 0, dateAdded: new Date().toISOString().split('T')[0]
  });
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // --- CREATOR ACTIONS ---

  const handleOpenModal = (creator?: Creator) => {
    if (creator) {
      setEditingId(creator.id);
      setFormData({
        name: creator.name,
        username: creator.username || '',
        niche: creator.niche,
        productCategory: creator.productCategory || 'Maikalian',
        email: creator.email,
        phone: creator.phone,
        videoLink: creator.videoLink || '',
        uploads: creator.uploads || [],
        avgViews: creator.avgViews,
        avgLikes: creator.avgLikes,
        avgComments: creator.avgComments,
        avgShares: creator.avgShares || 0,
        videosCount: creator.videosCount
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', username: '', niche: '', productCategory: 'Maikalian',
        email: '', phone: '', videoLink: '', uploads: [],
        avgViews: 0, avgLikes: 0, avgComments: 0, avgShares: 0, videosCount: 0
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
    if (e) { e.preventDefault(); e.stopPropagation(); }
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

  // --- VIDEO LIBRARY ACTIONS ---

  const openLibrary = (creator: Creator) => {
    setLibraryCreator(creator);
    setIsVideoFormOpen(false); // Reset form state
  };

  const openVideoForm = (video?: VideoUpload) => {
    if (video) {
        setEditingVideoId(video.id);
        setVideoFormData({ 
            ...video,
            // Format for date input (YYYY-MM-DD)
            dateAdded: video.dateAdded ? video.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]
        });
    } else {
        setEditingVideoId(null);
        setVideoFormData({ 
            title: '', url: '', product: 'Maikalian', 
            views: 0, likes: 0, comments: 0, shares: 0,
            dateAdded: new Date().toISOString().split('T')[0]
        });
    }
    setIsVideoFormOpen(true);
  };

  const saveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryCreator) return;

    // Create a copy of existing uploads
    let updatedUploads = [...(libraryCreator.uploads || [])];
    
    // Prepare proper ISO string for date
    const finalDate = videoFormData.dateAdded 
        ? new Date(videoFormData.dateAdded).toISOString() 
        : new Date().toISOString();

    if (editingVideoId) {
        // Update existing
        updatedUploads = updatedUploads.map(u => 
            u.id === editingVideoId ? { 
                ...u, 
                ...videoFormData as VideoUpload,
                dateAdded: finalDate
            } : u
        );
    } else {
        // Add new
        const newVideo: VideoUpload = {
            id: Date.now().toString(),
            dateAdded: finalDate,
            title: videoFormData.title || 'Untitled Video',
            url: videoFormData.url || '',
            product: videoFormData.product || 'Maikalian',
            views: videoFormData.views || 0,
            likes: videoFormData.likes || 0,
            comments: videoFormData.comments || 0,
            shares: videoFormData.shares || 0
        };
        updatedUploads.push(newVideo);
    }

    // Recalculate SUMS (Total) instead of Averages
    const count = updatedUploads.length;
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedCreator: CreatorFormData = {
        name: libraryCreator.name,
        username: libraryCreator.username,
        niche: libraryCreator.niche,
        productCategory: libraryCreator.productCategory,
        email: libraryCreator.email,
        phone: libraryCreator.phone,
        // Update legacy link to latest upload if exists
        videoLink: count > 0 ? updatedUploads[count-1].url : '',
        uploads: updatedUploads,
        // NOTE: Keeping property names 'avgViews' etc for DB compatibility, but storing TOTALS now.
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: count
    };

    await saveCreator(updatedCreator, libraryCreator.id);
    
    // Update local state to reflect changes immediately in modal
    setLibraryCreator({ ...libraryCreator, ...updatedCreator } as Creator);
    setIsVideoFormOpen(false);
  };

  const deleteVideo = async (videoId: string) => {
    if (!libraryCreator || !window.confirm("Delete this video log?")) return;

    const updatedUploads = (libraryCreator.uploads || []).filter(u => u.id !== videoId);

    // Recalculate SUMS (Total)
    const count = updatedUploads.length;
    const totalViews = updatedUploads.reduce((sum, u) => sum + u.views, 0);
    const totalLikes = updatedUploads.reduce((sum, u) => sum + u.likes, 0);
    const totalComments = updatedUploads.reduce((sum, u) => sum + u.comments, 0);
    const totalShares = updatedUploads.reduce((sum, u) => sum + (u.shares || 0), 0);

    const updatedCreator: CreatorFormData = {
        name: libraryCreator.name,
        username: libraryCreator.username,
        niche: libraryCreator.niche,
        productCategory: libraryCreator.productCategory,
        email: libraryCreator.email,
        phone: libraryCreator.phone,
        videoLink: count > 0 ? updatedUploads[count-1].url : '',
        uploads: updatedUploads,
        avgViews: totalViews,
        avgLikes: totalLikes,
        avgComments: totalComments,
        avgShares: totalShares,
        videosCount: count
    };

    await saveCreator(updatedCreator, libraryCreator.id);
    setLibraryCreator({ ...libraryCreator, ...updatedCreator } as Creator);
  };

  // --- EXPORT LOGIC ---
  const handleExportExcel = () => {
    const username = currentUser ? currentUser.split('@')[0] : 'Unknown User';
    const generateDate = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];

    // CSS Styles for the Excel file
    const tableStyle = `
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; }
        .header-container {
            padding: 20px 0;
            text-align: left;
            border-bottom: 3px solid #6d28d9; /* Purple divider */
            margin-bottom: 20px;
        }
        .brand-text {
            color: #4c1d95; /* Deep Brand Purple */
            font-size: 28px;
            font-weight: 900;
            margin: 0;
            text-transform: uppercase;
        }
        .campaign-text {
            color: #000000; /* SOLID BLACK */
            font-size: 16px;
            font-weight: bold;
            margin-top: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .meta-data {
            color: #374151; /* Dark Gray */
            font-size: 11px;
            margin-top: 15px;
            font-family: monospace;
        }
        table { border-collapse: collapse; width: 100%; border: 1px solid #e5e7eb; }
        th {
            background-color: #4c1d95; /* Deep Purple Header */
            color: white;
            border: 1px solid #312e81;
            padding: 12px 10px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            white-space: nowrap;
        }
        td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            text-align: left;
            vertical-align: middle;
            color: #1f2937;
            font-size: 11px;
        }
        tr:nth-child(even) { background-color: #f9fafb; }
        .num { text-align: right; font-family: 'Courier New', monospace; font-weight: bold; }
        .product-col { background-color: #f5f3ff; color: #4c1d95; font-weight: bold; }
      </style>
    `;

    const tableRows = creators.map(c => {
      // Calculate breakdown stats per specific product
      let maikalianViews = 0;
      let curtainViews = 0;
      let tshirtViews = 0;

      if (c.uploads) {
        c.uploads.forEach(u => {
            if (u.product === 'Maikalian') maikalianViews += u.views;
            if (u.product === 'Xmas Curtain') curtainViews += u.views;
            if (u.product === 'Tshirt') tshirtViews += u.views;
        });
      }

      return `
      <tr>
        <td style="font-weight:bold; font-size: 12px;">${c.name}</td>
        <td>${c.username || '-'}</td>
        <td>${c.niche}</td>
        <td class="num product-col">${maikalianViews.toLocaleString()}</td>
        <td class="num product-col">${curtainViews.toLocaleString()}</td>
        <td class="num product-col">${tshirtViews.toLocaleString()}</td>
        <td class="num">${c.avgLikes.toLocaleString()}</td>
        <td class="num">${c.avgViews.toLocaleString()}</td>
        <td class="num">${c.videosCount}</td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
      </tr>
    `}).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
        <x:ExcelWorkbook>
        <x:ExcelWorksheets>
        <x:ExcelWorksheet>
        <x:Name>Creator Analysis</x:Name>
        <x:WorksheetOptions>
        <x:DisplayGridlines/>
        </x:WorksheetOptions>
        </x:ExcelWorksheet>
        </x:ExcelWorksheets>
        </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        ${tableStyle}
      </head>
      <body>
        <div class="header-container">
          <div class="brand-text">Global Media Live</div>
          <div class="campaign-text">A.I Content Campaign Monitoring</div>
          <div class="meta-data">
             Generated by: ${username} | Date: ${generateDate}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Niche</th>
              <th>Maikalian Views</th>
              <th>Xmas Curtain Views</th>
              <th>Tshirt Views</th>
              <th>Total Likes</th>
              <th>Total Views</th>
              <th>Uploaded</th>
              <th>Email</th>
              <th>Phone</th>
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
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GML_Creator_Report_${dateStr}.xls`;
    link.click();
  };

  const handleExportCSV = () => {
    // Basic CSV Backup - retaining detailed export logic just for Excel as requested
    const headers = ['Name', 'Username', 'Niche', 'Category', 'Total Views', 'Total Likes', 'Total Comments', 'Total Shares', 'Total Videos'];
    const csvContent = [
      headers.join(','),
      ...creators.map(c => [
        `"${c.name}"`, `"${c.username}"`, `"${c.niche}"`, `"${c.productCategory}"`,
        c.avgViews, c.avgLikes, c.avgComments, c.avgShares || 0, c.videosCount
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredCreators = creators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.username && c.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-2 text-blue-200 text-sm shadow-sm backdrop-blur-md">
        <Cloud className="w-4 h-4" />
        All changes are automatically synced to Firebase Cloud Database.
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-900/50 backdrop-blur-md p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="relative w-full xl:w-96 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none group-hover:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search name, username, or niche..."
            className="w-full bg-gray-800/80 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all hover:bg-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <div className="flex bg-gray-800/80 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            >
              <TableIcon className="w-4 h-4" /> <span className="hidden sm:inline">Spreadsheet</span>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            >
              <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          <div className="w-px h-8 bg-gray-800 mx-2 hidden xl:block"></div>
          
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20">
            <FileSpreadsheet className="w-4 h-4" /> Report
          </button>

          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700">
            <FileText className="w-4 h-4" /> CSV
          </button>
          
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Add Creator
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredCreators.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed backdrop-blur-sm">
          <p>No creators found. Add one to start syncing.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
          {filteredCreators.map((creator) => (
            <div key={creator.id} className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 p-6 hover:border-blue-500/50 transition-colors group shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{creator.name}</h3>
                  {creator.username && (
                    <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                      <UserIcon className="w-3 h-3" /> @{creator.username}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="inline-block bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                      {creator.niche}
                    </span>
                    <span className="inline-block bg-blue-900/30 text-blue-200 text-xs px-2 py-1 rounded border border-blue-500/20">
                      {creator.productCategory || 'Other'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(creator)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDeleteClick(creator.id, creator.name, e)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                 {/* Uploads History Preview */}
                 {creator.uploads && creator.uploads.length > 0 ? (
                    <div className="bg-gray-800/50 p-2 rounded border border-gray-700/50">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span className="truncate max-w-[150px] font-medium text-white">
                                {creator.uploads[creator.uploads.length-1].title || "Latest Video"}
                            </span>
                            <span className={`px-1.5 rounded-sm shrink-0 ${
                               creator.uploads[creator.uploads.length-1].product === 'Maikalian' ? 'text-pink-300 bg-pink-900/20' : 
                               creator.uploads[creator.uploads.length-1].product === 'Xmas Curtain' ? 'text-red-300 bg-red-900/20' : 
                               'text-blue-300 bg-blue-900/20'
                            }`}>
                                {creator.uploads[creator.uploads.length-1].product}
                            </span>
                        </div>
                         <a href={creator.uploads[creator.uploads.length-1].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline truncate">
                             <PlayCircle className="w-3 h-3" /> Watch Video
                         </a>
                    </div>
                 ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                        <Video className="w-4 h-4" /> No uploads logged
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-4 gap-2 py-4 border-t border-gray-800">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase mb-1">
                    <Video className="w-3 h-3" /> Total Views
                  </div>
                  <span className="text-white font-bold text-sm">{creator.avgViews.toLocaleString()}</span>
                </div>
                <div className="text-center border-l border-gray-800">
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase mb-1">
                    <Heart className="w-3 h-3" /> Total Likes
                  </div>
                  <span className="text-white font-bold text-sm">{creator.avgLikes.toLocaleString()}</span>
                </div>
                 <div className="text-center border-l border-gray-800">
                   <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase mb-1">
                     <Share2 className="w-3 h-3" /> Total Share
                   </div>
                   <span className="text-white font-bold text-sm">{creator.avgShares ? creator.avgShares.toLocaleString() : 0}</span>
                </div>
                <div className="text-center flex items-center justify-center">
                   <button 
                     onClick={() => openLibrary(creator)}
                     className="bg-blue-600/90 hover:bg-blue-500 text-white p-2 rounded-lg shadow-lg shadow-blue-900/20 transition-all text-xs"
                     title="Manage Videos"
                   >
                     Manage
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 overflow-hidden animate-fade-in shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-800/80 text-gray-200 uppercase font-medium border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Primary Niche</th>
                  <th className="px-6 py-4">Latest Upload</th>
                  <th className="px-6 py-4 text-right">Total Views</th>
                  <th className="px-6 py-4 text-right">Total Shares</th>
                  <th className="px-6 py-4 text-center">Video Library</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredCreators.map((creator) => {
                  const latestUpload = creator.uploads && creator.uploads.length > 0 
                    ? creator.uploads[creator.uploads.length - 1] 
                    : null;

                  return (
                  <tr key={creator.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-white">{creator.name}</div>
                        <div className="text-gray-500 text-xs">@{creator.username}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs bg-gray-800/80 px-2 py-1 rounded">{creator.productCategory}</span>
                    </td>
                    <td className="px-6 py-4">
                       {latestUpload ? (
                         <div className="flex flex-col gap-1">
                             <span className="text-white font-medium text-xs">{latestUpload.title || "Untitled Video"}</span>
                             <div className="flex gap-2 items-center">
                               <span className={`text-[10px] px-1.5 py-0.5 rounded border w-fit ${
                                 latestUpload.product === 'Maikalian' ? 'bg-pink-900/30 text-pink-300 border-pink-500/30' :
                                 latestUpload.product === 'Xmas Curtain' ? 'bg-red-900/30 text-red-300 border-red-500/30' :
                                 'bg-blue-900/30 text-blue-300 border-blue-500/30'
                               }`}>
                                 {latestUpload.product}
                               </span>
                               <span className="text-[10px] text-gray-500">{new Date(latestUpload.dateAdded).toLocaleDateString()}</span>
                             </div>
                         </div>
                       ) : <span className="text-gray-600 italic">No Uploads</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-mono">{creator.avgViews.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-white font-mono">{creator.avgShares ? creator.avgShares.toLocaleString() : 0}</td>
                    <td className="px-6 py-4 text-center">
                       <button 
                          onClick={() => openLibrary(creator)}
                          className="flex items-center justify-center mx-auto px-4 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold gap-2"
                        >
                          <Video className="w-3 h-3" />
                          Manage Videos ({creator.videosCount})
                        </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleOpenModal(creator)} className="text-gray-500 hover:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => handleDeleteClick(creator.id, creator.name, e)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIDEO LIBRARY MODAL */}
      {libraryCreator && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl w-full max-w-5xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
               {/* Header */}
               <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                         <PlayCircle className="w-5 h-5 text-blue-400" /> Video Library
                    </h3>
                    <p className="text-sm text-gray-400">Managing uploads for <span className="text-white font-medium">{libraryCreator.name}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                        onClick={() => openVideoForm()} 
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                     >
                        <Plus className="w-4 h-4" /> Add Video
                     </button>
                     <button onClick={() => setLibraryCreator(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                  </div>
               </div>
               
               <div className="overflow-y-auto flex-1 p-0 bg-gray-950/50">
                  {/* Internal Form for Add/Edit */}
                  {isVideoFormOpen && (
                     <div className="p-6 bg-gray-900/80 border-b border-gray-800 animate-in slide-in-from-top-4">
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                            {editingVideoId ? <Edit2 className="w-4 h-4 text-blue-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                            {editingVideoId ? 'Edit Video Details' : 'Log New Video'}
                        </h4>
                        <form onSubmit={saveVideo} className="space-y-4">
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Video Title */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Video Name / Title</label>
                                    <div className="relative">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="e.g. Maikalian Shampoo Review v1" 
                                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={videoFormData.title}
                                            onChange={e => setVideoFormData({...videoFormData, title: e.target.value})}
                                        />
                                    </div>
                                </div>
                                {/* Upload Date */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Upload Date</label>
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

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Video Link</label>
                                    <div className="flex gap-2">
                                        <input 
                                            required 
                                            type="url" 
                                            placeholder="https://tiktok.com/@user/video/..." 
                                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={videoFormData.url}
                                            onChange={e => setVideoFormData({...videoFormData, url: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Product Label</label>
                                    <select 
                                        className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={videoFormData.product}
                                        onChange={e => setVideoFormData({...videoFormData, product: e.target.value})}
                                    >
                                        {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="hidden md:block"></div> {/* Spacer */}

                                {/* Stats Inputs */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Views</label>
                                    <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2" value={videoFormData.views} onChange={e => setVideoFormData({...videoFormData, views: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Likes</label>
                                    <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2" value={videoFormData.likes} onChange={e => setVideoFormData({...videoFormData, likes: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Comments</label>
                                    <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2" value={videoFormData.comments} onChange={e => setVideoFormData({...videoFormData, comments: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400 uppercase">Shares</label>
                                    <input type="number" className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2" value={videoFormData.shares} onChange={e => setVideoFormData({...videoFormData, shares: Number(e.target.value)})} />
                                </div>
                             </div>
                             <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsVideoFormOpen(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg">Save Video</button>
                             </div>
                        </form>
                     </div>
                  )}

                  {/* List */}
                  {(!libraryCreator.uploads || libraryCreator.uploads.length === 0) ? (
                     <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Video className="w-12 h-12 mb-3 opacity-20" />
                        <p>No videos logged yet. Click "Add Video" to start.</p>
                     </div>
                  ) : (
                     <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800 text-gray-400 uppercase font-medium sticky top-0 shadow-sm z-10">
                           <tr>
                              <th className="px-6 py-3">Video Title</th>
                              <th className="px-6 py-3">Product</th>
                              <th className="px-6 py-3">Upload Date</th>
                              <th className="px-6 py-3 text-right">Views</th>
                              <th className="px-6 py-3 text-right">Likes</th>
                              <th className="px-6 py-3 text-right">Shares</th>
                              <th className="px-6 py-3">Link</th>
                              <th className="px-6 py-3 text-center">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                           {[...libraryCreator.uploads].reverse().map((upload) => (
                              <tr key={upload.id} className="hover:bg-gray-800/50 bg-gray-900/50">
                                 <td className="px-6 py-3 font-medium text-white max-w-[200px] truncate">
                                     {upload.title || "Untitled Video"}
                                 </td>
                                 <td className="px-6 py-3">
                                    <span className={`text-xs px-2 py-1 rounded border ${
                                       upload.product === 'Maikalian' ? 'bg-pink-900/10 text-pink-400 border-pink-500/20' :
                                       upload.product === 'Xmas Curtain' ? 'bg-red-900/10 text-red-400 border-red-500/20' :
                                       'bg-blue-900/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                       {upload.product}
                                    </span>
                                 </td>
                                 <td className="px-6 py-3 text-gray-300">
                                     {upload.dateAdded ? new Date(upload.dateAdded).toLocaleDateString() : '-'}
                                 </td>
                                 <td className="px-6 py-3 text-right text-gray-300 font-mono">{upload.views.toLocaleString()}</td>
                                 <td className="px-6 py-3 text-right text-gray-300 font-mono">{upload.likes.toLocaleString()}</td>
                                 <td className="px-6 py-3 text-right text-gray-300 font-mono">{upload.shares ? upload.shares.toLocaleString() : 0}</td>
                                 <td className="px-6 py-3">
                                    <a href={upload.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1 w-fit">
                                       Link <ExternalLink className="w-3 h-3" />
                                    </a>
                                 </td>
                                 <td className="px-6 py-3 text-center flex items-center justify-center gap-3">
                                    <button onClick={() => openVideoForm(upload)} className="text-gray-500 hover:text-blue-400" title="Edit Video">
                                        <Edit2 className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => deleteVideo(upload.id)} className="text-gray-500 hover:text-red-400" title="Delete Video">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
           </div>
         </div>
      )}

      {/* Edit Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Creator Profile' : 'Add New Creator'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Full Name</label>
                  <input required type="text" className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                 <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Username (@)</label>
                  <input required type="text" placeholder="tiktok_user" className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Niche</label>
                  <input required type="text" className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
                </div>
                 <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Primary Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <select 
                      className="w-full bg-gray-900/80 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                      value={formData.productCategory}
                      onChange={e => setFormData({...formData, productCategory: e.target.value})}
                    >
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Email</label>
                  <input required type="email" className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Phone</label>
                  <input required type="tel" className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all">Save Profile</button>
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
              <h3 className="text-lg font-bold text-white mb-2">Delete Creator?</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete <strong>{deleteName}</strong>? This action cannot be undone.</p>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => { setDeleteId(null); setDeleteName(null); }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-900/20 transition-all"
                >
                  Delete
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CreatorList;
