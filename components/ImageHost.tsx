
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudUpload, Copy, Trash2, LayoutGrid, List, FileImage, 
  MoreVertical, Check, ExternalLink, HardDrive, Search, X 
} from 'lucide-react';
import { PublicAsset } from '../types';
import { subscribeToAssets, saveAsset, deleteAsset, uploadFile } from '../services/storageService';
import { auth } from '../services/firebase';

const ImageHost: React.FC = () => {
  const [assets, setAssets] = useState<PublicAsset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAssets(
      (data) => setAssets(data),
      (error) => console.error("Asset sync error", error)
    );
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const user = auth.currentUser?.email || 'Unknown';
      const uploadPromises = Array.from(files).map(async (file) => {
        const path = `public_assets/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const url = await uploadFile(file, path);
        
        const assetData: Omit<PublicAsset, 'id'> = {
          name: file.name,
          url: url,
          size: file.size,
          type: file.type,
          uploadedBy: user,
          createdAt: new Date().toISOString()
        };
        
        await saveAsset(assetData);
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload files.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, []);

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (asset: PublicAsset) => {
    if (window.confirm(`Delete ${asset.name}? This will break any existing links.`)) {
      await deleteAsset(asset.id, asset.url, asset.name);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden animate-fade-in">
      
      {/* Header Toolbar */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cloud Assets</h2>
            <p className="text-xs text-gray-400">{assets.length} items stored</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search files..."
               className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-600">
             <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                <LayoutGrid className="w-4 h-4" />
             </button>
             <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                <List className="w-4 h-4" />
             </button>
          </div>

          <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-blue-900/20">
             <CloudUpload className="w-4 h-4" /> Upload
             <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-y-auto p-6 relative bg-gray-900"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {dragActive && (
          <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center">
             <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
                <CloudUpload className="w-12 h-12 text-blue-400 mb-2" />
                <h3 className="text-xl font-bold text-white">Drop files to upload</h3>
             </div>
          </div>
        )}

        {/* Loading State */}
        {uploading && (
           <div className="absolute top-0 left-0 w-full h-1 bg-gray-800 overflow-hidden z-20">
              <div className="h-full bg-blue-500 animate-progress"></div>
           </div>
        )}

        {/* Assets Grid/List */}
        {filteredAssets.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl m-2">
              <div className="bg-gray-800 p-4 rounded-full mb-4">
                 <FileImage className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium">No assets found.</p>
              <p className="text-sm">Drag and drop files here to upload.</p>
           </div>
        ) : viewMode === 'grid' ? (
           <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6">
              {filteredAssets.map(asset => (
                 <div key={asset.id} className="group relative bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-500/50 transition-all">
                    {/* Preview */}
                    <div className="aspect-square bg-gray-900 relative overflow-hidden flex items-center justify-center">
                       {asset.type.startsWith('image/') ? (
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                       ) : (
                          <FileImage className="w-12 h-12 text-gray-600" />
                       )}
                       {/* Overlay Actions */}
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button 
                            onClick={() => copyLink(asset.url, asset.id)}
                            className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-200 transition-colors"
                          >
                             {copiedId === asset.id ? <Check className="w-3 h-3 text-green-600"/> : <Copy className="w-3 h-3"/>}
                             {copiedId === asset.id ? 'Copied' : 'Copy Link'}
                          </button>
                          <a href={asset.url} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white p-2">
                             <ExternalLink className="w-4 h-4" />
                          </a>
                       </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                       <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-white truncate w-full" title={asset.name}>{asset.name}</h4>
                          <button onClick={() => handleDelete(asset)} className="text-gray-500 hover:text-red-400 p-0.5">
                             <X className="w-3 h-3" />
                          </button>
                       </div>
                       <p className="text-[10px] text-gray-500 mt-1">{formatSize(asset.size)}</p>
                    </div>
                 </div>
              ))}
           </div>
        ) : (
           <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                 <thead className="bg-gray-900/50 text-gray-400 uppercase font-medium text-xs border-b border-gray-700">
                    <tr>
                       <th className="px-6 py-3">File Name</th>
                       <th className="px-6 py-3">Size</th>
                       <th className="px-6 py-3">Uploaded</th>
                       <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-700">
                    {filteredAssets.map(asset => (
                       <tr key={asset.id} className="hover:bg-gray-750/50 transition-colors group">
                          <td className="px-6 py-3">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                                   {asset.type.startsWith('image/') ? (
                                      <img src={asset.url} className="w-full h-full object-cover" />
                                   ) : (
                                      <FileImage className="w-4 h-4 text-gray-500" />
                                   )}
                                </div>
                                <span className="font-medium text-white truncate max-w-[200px]">{asset.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-3 text-gray-400 font-mono text-xs">{formatSize(asset.size)}</td>
                          <td className="px-6 py-3 text-gray-400 text-xs">{new Date(asset.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-3 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => copyLink(asset.url, asset.id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                                  title="Copy Link"
                                >
                                   {copiedId === asset.id ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                                </button>
                                <button 
                                  onClick={() => handleDelete(asset)}
                                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                                  title="Delete"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}
      </div>
    </div>
  );
};

export default ImageHost;
