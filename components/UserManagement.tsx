import React, { useState, useEffect } from 'react';
import { User, Shield, Users, Mail, Calendar, CheckCircle, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { subscribeToUsers, assignUserRole } from '../services/authService';
import { User as UserType } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load users", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await assignUserRole(uid, newRole as 'ADMIN' | 'EDITOR' | 'CSR');
      // No need to manually update state, the subscription will handle it
    } catch (e: any) {
      alert("Failed to update role: " + e.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'CSR': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Info Banner */}
       <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-full">
               <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Team Directory</h3>
              <p className="text-gray-400 text-sm mt-1">
                Manage access levels and roles for all registered employees.
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search user..." 
               className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
       </div>

       {/* User List */}
       <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
             <div className="p-12 text-center text-gray-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No users found.</div>
          ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-gray-900 text-gray-400 uppercase font-bold text-xs border-b border-gray-700">
                   <tr>
                     <th className="px-6 py-4">Employee</th>
                     <th className="px-6 py-4">Contact</th>
                     <th className="px-6 py-4">Account Created</th>
                     <th className="px-6 py-4">Access Level</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-700">
                   {filteredUsers.map((user) => {
                     // Clean up username for display
                     const displayName = user.username || user.email?.split('@')[0] || 'Unknown';
                     const initials = displayName.substring(0, 2).toUpperCase();

                     return (
                       <tr key={user.id} className="hover:bg-gray-750/50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                               user.role === 'ADMIN' ? 'bg-gradient-to-tr from-purple-600 to-pink-600' : 
                               user.role === 'CSR' ? 'bg-gradient-to-tr from-orange-500 to-yellow-500' : 
                               'bg-gradient-to-tr from-blue-600 to-cyan-600'
                             }`}>
                               {initials}
                             </div>
                             <div>
                               <div className="font-bold text-white">{displayName}</div>
                               <div className="text-xs text-gray-500 font-mono">{user.id.slice(0,8)}...</div>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-gray-300">
                           <div className="flex items-center gap-2">
                             <Mail className="w-3 h-3 text-gray-500" />
                             {user.email || 'No Email'}
                           </div>
                         </td>
                         <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                           <div className="flex items-center gap-2">
                             <Calendar className="w-3 h-3 text-gray-600" />
                             {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="relative w-fit">
                             <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Shield className={`w-3 h-3 ${
                                  user.role === 'ADMIN' ? 'text-purple-400' :
                                  user.role === 'CSR' ? 'text-orange-400' :
                                  'text-blue-400'
                                }`} />
                             </div>
                             <select 
                               value={user.role} 
                               onChange={(e) => handleRoleChange(user.id, e.target.value)}
                               className={`
                                 appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800
                                 ${getRoleBadgeColor(user.role)}
                               `}
                             >
                               <option value="EDITOR">EDITOR</option>
                               <option value="CSR">CSR</option>
                               <option value="ADMIN">ADMIN</option>
                             </select>
                             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          )}
       </div>
    </div>
  );
};

export default UserManagement;