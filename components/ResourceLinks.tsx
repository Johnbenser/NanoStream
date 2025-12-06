
import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, Trash2, Edit2, Link as LinkIcon, Globe, X } from 'lucide-react';
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

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
         <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <LinkIcon className="w-6 h-6 text-blue-400" />
             Internal Links & Resources
           </h2>
           <p className="text-gray-400 text-sm mt-1">
             Quick access to company websites, tools, and documentation.
           </p>
         </div>
         <button 
           onClick={handleOpenModal}
           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
         >
           <Plus className="w-4 h-4" /> Add Link
         </button>
       </div>

       {/* Grid */}
       {links.length === 0 ? (
         <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
           <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
           <p>No links added yet.</p>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {links.map((link) => (
             <div key={link.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 transition-colors group flex flex-col h-full">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-blue-500/10 p-2.5 rounded-lg">
                   <Globe className="w-6 h-6 text-blue-400" />
                 </div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(link)}
                      className="text-gray-500 hover:text-white p-1"
                      title="Edit Link"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(link.id, link.title)}
                      className="text-gray-500 hover:text-red-400 p-1"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               </div>
               
               <h3 className="text-lg font-bold text-white mb-2">{link.title}</h3>
               <p className="text-gray-400 text-sm mb-6 flex-1 line-clamp-3">
                 {link.description}
               </p>
               
               <div className="mt-auto pt-4 border-t border-gray-700 flex items-center justify-between">
                 <span className="text-xs text-gray-500">Added by {link.addedBy}</span>
                 <a 
                   href={link.url} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                 >
                   Open <ExternalLink className="w-3 h-3" />
                 </a>
               </div>
             </div>
           ))}
         </div>
       )}

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Link' : 'Add New Link'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase">Title</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Company Portal"
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase">URL</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="https://example.com"
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase">Description</label>
                <textarea 
                  required 
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  placeholder="Briefly describe this resource..."
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-lg shadow-blue-900/20 mt-4"
              >
                {loading ? 'Saving...' : (editingId ? 'Update Link' : 'Add Link')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceLinks;
