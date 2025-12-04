import React, { useEffect, useState } from 'react';
import { History, Shield, Trash2, Edit, Plus, User, FileSpreadsheet, LogIn, LogOut } from 'lucide-react';
import { LogEntry } from '../types';
import { subscribeToLogs } from '../services/storageService';

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Subscribe to logs, ignoring detailed connection errors here as App.tsx handles global DB alerts
    const unsubscribe = subscribeToLogs(
      (data) => {
        setLogs(data);
      },
      (error) => {
        console.warn("Log sync warning:", error.message);
      }
    );
    return () => unsubscribe();
  }, []);

  const getIcon = (action: LogEntry['action']) => {
    switch (action) {
      case 'CREATE': return <Plus className="w-4 h-4 text-green-400" />;
      case 'UPDATE': return <Edit className="w-4 h-4 text-blue-400" />;
      case 'DELETE': return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'IMPORT': return <FileSpreadsheet className="w-4 h-4 text-yellow-400" />;
      case 'LOGIN': return <LogIn className="w-4 h-4 text-purple-400" />;
      case 'LOGOUT': return <LogOut className="w-4 h-4 text-gray-400" />;
      default: return <History className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: LogEntry['action']) => {
     switch (action) {
      case 'CREATE': return 'bg-green-400/10 border-green-400/20 text-green-400';
      case 'UPDATE': return 'bg-blue-400/10 border-blue-400/20 text-blue-400';
      case 'DELETE': return 'bg-red-400/10 border-red-400/20 text-red-400';
      case 'LOGIN': return 'bg-purple-400/10 border-purple-400/20 text-purple-400';
      default: return 'bg-gray-700/50 border-gray-600 text-gray-300';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex items-center gap-3 mb-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
         <div className="bg-purple-500/20 p-3 rounded-lg">
            <Shield className="w-6 h-6 text-purple-400" />
         </div>
         <div>
           <h3 className="text-xl font-bold text-white">System Activity Logs</h3>
           <p className="text-gray-400 text-sm">Monitor all administrative actions and database changes.</p>
         </div>
       </div>

       <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
         {logs.length === 0 ? (
           <div className="p-12 text-center text-gray-500">No activity recorded yet.</div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-900 text-gray-400 uppercase font-medium border-b border-gray-700">
                 <tr>
                   <th className="px-6 py-4">Action</th>
                   <th className="px-6 py-4">Details</th>
                   <th className="px-6 py-4">User</th>
                   <th className="px-6 py-4 text-right">Timestamp</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-700">
                 {logs.map((log) => (
                   <tr key={log.id} className="hover:bg-gray-750/50 transition-colors">
                     <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                         {getIcon(log.action)}
                         {log.action}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-white font-medium">
                       {log.target}
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-gray-300">
                         <User className="w-4 h-4" />
                         {log.user}
                       </div>
                     </td>
                     <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                       {new Date(log.timestamp).toLocaleString()}
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

export default ActivityLogs;