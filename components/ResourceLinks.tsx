
import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, Trash2, Edit2, Link as LinkIcon, Globe, X, Calendar, User } from 'lucide-react';
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
    <div className="space-y-6 animate-fade-in max-w-5xl">
       {/* Header / Toolbar */}
       <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start gap-4">
         <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <LinkIcon className="w-5 h-5 text-blue-400" />
             Internal Links Directory
           </h2>
           <p className="text-gray-400 text-sm mt-1">
             Access company portals, documentation, and external resources.
           </p>
         </div>
         <button 
           onClick={handleOpenModal}
           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 text-sm"
         >
           <Plus className="w-4 h-4" /> Add New Link
         </button>
       </div>

       {/* List View */}
       {links.length === 0 ? (
         <div className="p-8 text-left text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed flex items-start gap-4">
           <div className="bg-gray-800 p-3 rounded-lg">
             <Globe className="w-6 h-6 opacity-30" />
           </div>
           <div>
             <p className="text-white font-medium">No links found</p>
             <p className="text-sm">Get started by adding your first resource link above.</p>
           </div>
         </div>
       ) : (
         <div className="flex flex-col gap-3">
           {links.map((link) => (
             <div key={link.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-blue-500/30 transition-all group flex flex-col md:flex-row gap-4 items-start">
               
               {/* Icon */}
               <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 shrink-0">
                 <Globe className="w-5 h-5 text-blue-400" />
               </div>

               {/* Content */}
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-3 mb-1">
                   <h3 className="text-base font-bold text-white truncate">{link.title}</h3>
                   <span className="hidden md:inline text-gray-600">•</span>
                   <a 
                     href={link.url} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="text-xs text-blue-400 hover:underline flex items-center gap-1 bg-blue-900/10 px-2 py-0.5 rounded border border-blue-500/10"
                   >
                     {link.url} <ExternalLink className="w-3 h-3" />
                   </a>
                 </div>
                 
                 <p className="text-gray-400 text-sm leading-relaxed mb-2">
                   {link.description}
                 </p>

                 <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {link.addedBy}
                    </div>
                    {link.createdAt && (
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(link.createdAt).toLocaleDateString()}
                        </div>
                    )}
                 </div>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-start md:self-center">
                  <button 
                    onClick={() => handleEdit(link)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit Link"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(link.id, link.title)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <a 
                     href={link.url} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="ml-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    Visit
                  </a>
               </div>
             </div>
           ))}
         </div>
       )}

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {editingId ? <Edit2 className="w-4 h-4 text-purple-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                  {editingId ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase">Resource Title</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-600"
                  placeholder="e.g. Employee Handbook"
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase">Direct URL</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-600"
                  placeholder="https://..."
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase">Description</label>
                <textarea 
                  required 
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-gray-600"
                  placeholder="Briefly describe what this link is for..."
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <div className="pt-2">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-lg shadow-blue-900/20"
                >
                    {loading ? 'Saving...' : 'Save Resource Link'}
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
