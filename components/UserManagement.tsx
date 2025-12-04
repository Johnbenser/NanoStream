import React, { useState } from 'react';
import { User, Plus, Shield, User as UserIcon, Save, X, Database } from 'lucide-react';
import { assignUserRole } from '../services/authService';

const UserManagement: React.FC = () => {
  // In a real client-side app, listing all users requires Admin SDK.
  // Here we allow assigning roles to existing UIDs or Emails if implementing custom logic.
  // For simplicity in this demo without backend, we show the Role Assignment form.
  
  const [formData, setFormData] = useState({ uid: '', username: '', role: 'EDITOR' as 'ADMIN' | 'EDITOR' | 'CSR' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.uid || !formData.username) {
      setStatus('Please provide both User UID and Username.');
      return;
    }

    try {
      const syntheticEmail = `${formData.username.trim().replace(/\s+/g, '')}@nanostream.internal`;
      await assignUserRole(formData.uid, syntheticEmail, formData.role);
      setStatus('Role assigned successfully! The user will see this role on next login.');
      setFormData({ uid: '', username: '', role: 'EDITOR' });
    } catch (e: any) {
      setStatus('Error: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Info Banner */}
       <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-bold text-blue-300">Firebase Auth Management</h4>
            <p className="text-gray-400 mt-1">
              To update team permissions:
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Go to <strong>Firebase Console {'>'} Authentication</strong> and copy the <strong>User UID</strong> of the employee.</li>
                <li>Enter the UID and their Username below to assign a specific Role.</li>
              </ol>
            </p>
          </div>
       </div>

       {/* Assign Role Form */}
       <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Assign User Roles
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase mb-1">User UID (From Firebase)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 7d8f9g87df9g..."
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={formData.uid}
                    onChange={e => setFormData({...formData, uid: e.target.value})}
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Username</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. johndoe"
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
              </div>
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
            
            {status && <p className={`text-sm ${status.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{status}</p>}

            <div className="pt-2">
                <button type="submit" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20">
                  <Save className="w-4 h-4" /> Save Permissions
                </button>
            </div>
          </form>
       </div>
    </div>
  );
};

export default UserManagement;