
import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, Trash2, Edit2, Link as LinkIcon, Globe, X, Calendar, User, ArrowUpRight, MoreVertical } from 'lucide-react';
import { ResourceLink } from '../types';
import { subscribeToResources, saveResource, deleteResource } from '../services/storageService';

const ResourceLinks: React.FC = () => {
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', url: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToResources(
      (data) => setLinks(data),
      (error) => console.error("Failed to load links", error)
    );
    return () => unsubscribe();
  }, []);

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({ title: '', url: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (link: ResourceLink) => {
    setEditingId(link.id);
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure URL has protocol
      let finalUrl = formData.url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      
      await saveResource({
        title: formData.title,
        url: finalUrl,
        description: formData.description
      }, editingId || undefined);

      setIsModalOpen(false);
      setFormData({ title: '', url: '', description: '' });
      setEditingId(null);
    } catch (err) {
      alert("Failed to save link");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete link "${title}"?`)) {
      await deleteResource(id, title);
    }
  };

  const getDomain = (url: string) => {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch (e) {
        return 'Link';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
       {/* Header / Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
         <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg">
                <LinkIcon className="w-5 h-5 text-white" />
             </div>
             Internal Links Directory
           </h2>
           <p className="text-gray-400 mt-2 text-sm max-w-xl">
             Quick access to company portals, documentation, and external tools.
           </p>
         </div>
         <button 
           onClick={handleOpenModal}
           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95"
         >
           <Plus className="w-5 h-5" /> Add Resource
         </button>
       </div>

       {/* Links Grid */}
       {links.length === 0 ? (
           <div className="p-16 text-center flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-2xl border border-gray-700 border-dashed">
             <div className="bg-gray-800 p-4 rounded-full mb-4 ring-1 ring-gray-700">
                <Globe className="w-10 h-10 opacity-40" />
             </div>
             <p className="text-white font-medium text-lg">No links found</p>
             <p className="text-sm mt-1">Get started by adding your first resource link above.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {links.map((link) => (
               <div key={link.id} className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/30 rounded-2xl flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden">
                
                {/* Decorative Header */}
                <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 w-full opacity-70 group-hover:opacity-100 transition-opacity"></div>

                <div className="p-6 flex flex-col flex-1 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 group-hover:border-blue-500/30 transition-colors shadow-inner">
                            <Globe className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={() => handleEdit(link)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Edit">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(link.id, link.title)} className="p-1.5 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400" title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-blue-300 transition-colors">
                        {link.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                        {link.description}
                    </p>

                    <div className="mt-auto space-y-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 font-mono border-t border-gray-700/50 pt-3">
                            <span className="flex items-center gap-1.5">
                                <User className="w-3 h-3" /> {link.addedBy}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> {new Date(link.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-blue-600 text-gray-300 hover:text-white py-2.5 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all font-medium text-sm group/btn"
                        >
                            <LinkIcon className="w-3 h-3 text-blue-500 group-hover/btn:text-white" />
                            Visit {getDomain(link.url)}
                            <ArrowUpRight className="w-3 h-3 opacity-50" />
                        </a>
                    </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-500"></div>
             </div>
             ))}
           </div>
         )}

       {/* Add/Edit Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/80">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {editingId ? <Edit2 className="w-4 h-4 text-purple-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                  {editingId ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Resource Title</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-600 transition-all"
                  placeholder="e.g. Employee Handbook 2024"
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Direct URL</label>
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                    required 
                    type="text" 
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-600 transition-all"
                    placeholder="https://..."
                    value={formData.url} 
                    onChange={e => setFormData({...formData, url: e.target.value})} 
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Description</label>
                <textarea 
                  required 
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-gray-600 transition-all"
                  placeholder="Briefly describe what this link is for..."
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 rounded-xl font-medium transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all transform active:scale-95"
                >
                    {loading ? 'Saving...' : (editingId ? 'Update Link' : 'Save Resource')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceLinks;
