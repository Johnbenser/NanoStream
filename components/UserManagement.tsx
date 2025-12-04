import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Shield, User as UserIcon, Save, X, AlertTriangle } from 'lucide-react';
import { User as UserType } from '../types';
import { getUsers, addUser, deleteUser, getCurrentUser } from '../services/authService';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'EDITOR' as 'ADMIN' | 'EDITOR' | 'CSR' });
  const [error, setError] = useState('');
  
  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const initiateDelete = (id: string, username: string) => {
    if (username === currentUser) {
      alert("You cannot delete yourself.");
      return;
    }
    setDeleteId(id);
    setDeleteName(username);
  };

  const confirmDelete = () => {
    if (deleteId) {
      try {
        deleteUser(deleteId);
        loadUsers();
      } catch (e: any) {
        alert(e.message);
      } finally {
        setDeleteId(null);
        setDeleteName(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    try {
      addUser(formData);
      setIsAdding(false);
      setFormData({ username: '', password: '', role: 'EDITOR' });
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
         <div>
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <Shield className="w-5 h-5 text-purple-400" />
             Team Management
           </h3>
           <p className="text-gray-400 text-sm mt-1">Manage access permissions and authorized users.</p>
         </div>
         <button 
           onClick={() => setIsAdding(true)}
           className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
         >
           <Plus className="w-4 h-4" /> Add Team Member
         </button>
       </div>

       {/* Add User Form */}
       {isAdding && (
         <div className="bg-gray-800 p-6 rounded-xl border border-purple-500/30 shadow-lg animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-white">New User Details</h4>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Username</label>
                   <input 
                     type="text" 
                     required
                     className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                     value={formData.username}
                     onChange={e => setFormData({...formData, username: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Password</label>
                   <input 
                     type="text" 
                     required
                     className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                     value={formData.password}
                     onChange={e => setFormData({...formData, password: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Role</label>
                   <select 
                     className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                     value={formData.role}
                     onChange={e => setFormData({...formData, role: e.target.value as 'ADMIN' | 'EDITOR' | 'CSR'})}
                   >
                     <option value="EDITOR">Editor (Standard)</option>
                     <option value="CSR">CSR (Support)</option>
                     <option value="ADMIN">Admin (Full Access)</option>
                   </select>
                </div>
              </div>
              
              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end pt-2">
                 <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    <Save className="w-4 h-4" /> Save User
                 </button>
              </div>
            </form>
         </div>
       )}

       {/* Users List */}
       <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
               <tr>
                 <th className="px-6 py-4">User</th>
                 <th className="px-6 py-4">Role</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-700">
               {users.map(user => (
                 <tr key={user.id} className="hover:bg-gray-750/50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                         </div>
                         <span className="font-medium text-white">{user.username}</span>
                         {user.username === currentUser && (
                           <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">You</span>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' ? (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-bold">ADMIN</span>
                      ) : user.role === 'CSR' ? (
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded font-medium">CSR</span>
                      ) : (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded font-medium">EDITOR</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-green-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => initiateDelete(user.id, user.username)}
                         disabled={user.username === currentUser}
                         className={`p-2 rounded-lg transition-colors ${
                           user.username === currentUser 
                             ? 'text-gray-600 cursor-not-allowed' 
                             : 'text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                         }`}
                         title="Remove User"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
       </div>

       {/* Delete User Modal */}
       {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Remove Team Member?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to remove <span className="text-white font-semibold">{deleteName}</span>? They will lose access immediately.
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
                  Yes, Remove
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;