import React, { useState } from 'react';
import { Creator, CreatorFormData } from '../types';
import { Edit2, Trash2, Search, Download, Plus, Briefcase, ExternalLink, X } from 'lucide-react';
import { saveClient, deleteClient } from '../services/storageService';

interface ClientListProps {
  clients: Creator[];
  currentUser?: string;
}

const ClientList: React.FC<ClientListProps> = ({ clients, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Creator | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '',
    username: '',
    niche: '',
    productCategory: 'Client Brand',
    email: '',
    phone: '',
    tiktokLink: '',
    avgViews: 0,
    avgLikes: 0,
    avgComments: 0,
    avgShares: 0,
    videosCount: 0
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (client?: Creator) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        username: client.username,
        niche: client.niche,
        productCategory: client.productCategory,
        email: client.email,
        phone: client.phone,
        tiktokLink: client.tiktokLink || '',
        avgViews: client.avgViews,
        avgLikes: client.avgLikes,
        avgComments: client.avgComments,
        avgShares: client.avgShares,
        videosCount: client.videosCount
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        username: '',
        niche: '',
        productCategory: 'Client Brand',
        email: '',
        phone: '',
        tiktokLink: '',
        avgViews: 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        videosCount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveClient(formData, editingClient?.id);
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save client.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete client ${name}?`)) {
      await deleteClient(id, name);
    }
  };

  // --- EXPORT ---
  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    
    let videoRows = '';
    clients.forEach(client => {
      if (client.uploads && client.uploads.length > 0) {
        client.uploads.forEach(v => {
          // Escape URL amp characters for Excel HTML compatibility
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-white">Client Management</h2>
          <p className="text-gray-400 text-sm">Manage brand profiles and monitor video campaigns.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                <Plus className="w-4 h-4"/> Add Client
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                <Download className="w-4 h-4"/> Export Report
            </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search clients..." 
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
                <tr>
                   <th className="px-6 py-3">Client Brand</th>
                   <th className="px-6 py-3">Industry / Niche</th>
                   <th className="px-6 py-3">Campaign Stats</th>
                   <th className="px-6 py-3 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-700">
               {filteredClients.length === 0 ? (
                 <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No clients found.</td></tr>
               ) : (
                 filteredClients.map(client => (
                   <tr key={client.id} className="hover:bg-gray-750/50">
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400">
                           <Briefcase className="w-5 h-5" />
                         </div>
                         <div>
                           <div className="font-bold text-white">{client.name}</div>
                           <div className="text-xs text-gray-500">{client.email}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-gray-300">
                       <span className="bg-gray-900 px-2 py-1 rounded border border-gray-700 text-xs">{client.niche}</span>
                     </td>
                     <td className="px-6 py-4 text-gray-300">
                       <div className="text-xs">
                          <div><span className="text-white font-bold">{client.videosCount || 0}</span> Videos</div>
                          <div className="text-gray-500">{(client.avgViews || 0).toLocaleString()} Views</div>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                         {client.tiktokLink && (
                           <a href={client.tiktokLink} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                             <ExternalLink className="w-4 h-4" />
                           </a>
                         )}
                         <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDelete(client.id, client.name)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">{editingClient ? 'Edit Client' : 'New Client'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Brand Name</label>
                      <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Industry / Niche</label>
                      <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Contact Email</label>
                    <input type="email" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">TikTok Profile Link</label>
                    <input type="url" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.tiktokLink} onChange={e => setFormData({...formData, tiktokLink: e.target.value})} />
                </div>
                <div className="flex justify-end pt-4">
                   <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg">Save Client</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;