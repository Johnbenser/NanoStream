
import React, { useState, useEffect } from 'react';
import { VaultAccount } from '../types';
import { subscribeToVault, saveVaultAccount, deleteVaultAccount } from '../services/storageService';
import { 
  Shield, Plus, Search, Edit2, Trash2, Smartphone, 
  Copy, Eye, EyeOff, Check, Monitor, Globe, Key, X, 
  ChevronDown, ChevronRight, AlertTriangle, Apple, FileSpreadsheet, UserX, HelpCircle, Filter, Mail, User
} from 'lucide-react';
import * as OTPAuth from 'otpauth';

// --- TOTP COMPONENT ---
const TOTPDisplay: React.FC<{ secret: string }> = ({ secret }) => {
  const [code, setCode] = useState<string>('------');
  const [progress, setProgress] = useState<number>(100);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!secret) return;

    const updateToken = () => {
      try {
        const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
        const totp = new OTPAuth.TOTP({
          secret: OTPAuth.Secret.fromBase32(cleanSecret),
          algorithm: 'SHA1',
          digits: 6,
          period: 30
        });
        const token = totp.generate();
        setCode(token);
        const epoch = Math.floor(Date.now() / 1000);
        const count = epoch % 30;
        const percent = ((30 - count) / 30) * 100;
        setProgress(percent);
      } catch (e) {
        setCode('INVALID KEY');
        setProgress(0);
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (code === 'INVALID KEY') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 bg-gray-900/60 rounded-xl p-3 border border-gray-700/50 relative overflow-hidden group/totp cursor-pointer hover:border-blue-500/50 transition-colors" onClick={handleCopy}>
       <div 
         className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-linear" 
         style={{ width: `${progress}%`, opacity: progress < 20 ? 0.5 : 1 }}
       ></div>
       <div className="flex justify-between items-center relative z-10">
          <div>
             <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
               <Key className="w-3 h-3" /> 2FA Code
             </p>
             <p className={`text-2xl font-mono font-bold tracking-[0.2em] leading-none mt-1 ${code === 'INVALID KEY' ? 'text-red-400 text-sm' : 'text-white group-hover/totp:text-blue-400 transition-colors'}`}>
               {code === 'INVALID KEY' ? code : `${code.slice(0,3)} ${code.slice(3)}`}
             </p>
          </div>
          <div className="bg-gray-800 p-2 rounded-lg text-gray-400 group-hover/totp:text-white group-hover/totp:bg-blue-600 transition-all">
             {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </div>
       </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
interface AccountVaultProps {
  currentUser?: string;
}

const AccountVault: React.FC<AccountVaultProps> = ({ currentUser }) => {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'contains' | 'start' | 'end'>('contains');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<VaultAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  
  // Section Visibility State
  const [sections, setSections] = useState({
    restricted: true,
    notSigned: true,
    ios: true,
    android: true,
    unassigned: true,
    other: true
  });

  // Form State
  const [formData, setFormData] = useState<Partial<VaultAccount>>({
    platform: '', username: '', password: '', emailPassword: '', handle: '', secretKey: '', notes: '', device: '', status: 'GOOD ACC.'
  });

  useEffect(() => {
    const unsubscribe = subscribeToVault(
      (data) => setAccounts(data),
      (error) => console.error("Vault sync error", error)
    );
    return () => unsubscribe();
  }, []);

  // --- HELPERS ---
  const togglePassword = (id: string) => setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const getDeviceStyle = (device: string = '') => {
    const d = device.toLowerCase();
    if (d.includes('iphone') || d.includes('apple') || d.includes('ipad')) {
      return { gradient: 'from-gray-800 to-black', icon: <Apple className="w-12 h-12 text-gray-500/50" />, label: 'Apple iOS', accent: 'border-gray-600' };
    }
    if (d.includes('android') || d.includes('samsung') || d.includes('pixel') || d.includes('xiaomi') || d.includes('redmi') || d.includes('oppo') || d.includes('vivo')) {
      return { gradient: 'from-green-900 to-emerald-950', icon: <Smartphone className="w-12 h-12 text-green-500/50" />, label: 'Android', accent: 'border-green-600' };
    }
    if (d.includes('pc') || d.includes('windows') || d.includes('mac') || d.includes('laptop') || d.includes('desktop')) {
      return { gradient: 'from-blue-900 to-slate-900', icon: <Monitor className="w-12 h-12 text-blue-500/50" />, label: 'Desktop', accent: 'border-blue-600' };
    }
    return { gradient: 'from-purple-900 to-gray-900', icon: <Globe className="w-12 h-12 text-purple-500/50" />, label: 'Web / Other', accent: 'border-purple-600' };
  };

  const getStatusBadge = (status: string = '') => {
    const s = status.toUpperCase();
    if (s.includes('RESTRICTED') || s.includes('BANNED')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (s.includes('VERIFY')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (s.includes('NOT SIGNED')) return 'bg-gray-700 text-gray-400 border-gray-600';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  // --- CRUD OPERATIONS ---
  const handleOpenModal = (account?: VaultAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({ ...account });
    } else {
      setEditingAccount(null);
      setFormData({ platform: '', username: '', password: '', emailPassword: '', handle: '', secretKey: '', notes: '', device: '', status: 'GOOD ACC.' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveVaultAccount(formData, editingAccount?.id);
      setIsModalOpen(false);
    } catch (e) { alert("Failed to save account."); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (window.confirm(`Delete account ${username}?`)) await deleteVaultAccount(id, username);
  };

  // --- SEGREGATION & FILTERING ---
  const filterAccount = (acc: VaultAccount) => {
    if (!searchTerm) return true;
    
    // Username search with mode (First letter, Last letter, etc.)
    // Strip domain (@...) for the search check as requested
    const usernameOnly = acc.username.split('@')[0].toLowerCase();
    const term = searchTerm.toLowerCase();
    
    let matchUser = false;
    if (searchMode === 'start') {
        matchUser = usernameOnly.startsWith(term);
    } else if (searchMode === 'end') {
        matchUser = usernameOnly.endsWith(term);
    } else {
        matchUser = usernameOnly.includes(term);
    }

    if (matchUser) return true;

    // Fallback: search other fields (device, handle) using 'contains' logic regardless of mode if primary user search fails
    if (searchMode === 'contains') {
        return (acc.device && acc.device.toLowerCase().includes(term)) || 
               (acc.handle && acc.handle.toLowerCase().includes(term)) ||
               (acc.status && acc.status.toLowerCase().includes(term));
    }
    
    return false;
  };

  const filteredAccounts = accounts.filter(filterAccount);

  // 1. Status Groups
  const notSignedGroup = filteredAccounts.filter(a => a.status?.toUpperCase().includes('NOT SIGNED'));
  const restrictedGroup = filteredAccounts.filter(a => !a.status?.toUpperCase().includes('NOT SIGNED') && (a.status?.toUpperCase().includes('RESTRICTED') || a.status?.toUpperCase().includes('BANNED') || a.status?.toUpperCase().includes('VERIFY')));
  
  // 2. Good Accounts (Ready for assignment/use)
  const goodAccounts = filteredAccounts.filter(a => !notSignedGroup.includes(a) && !restrictedGroup.includes(a));
  
  // 3. Device Segmentation (from Good Accounts)
  const iosGroup = goodAccounts.filter(a => /iphone|ios|apple|ipad/i.test(a.device || ''));
  const androidGroup = goodAccounts.filter(a => /android|samsung|pixel|galaxy|xiaomi|redmi|oppo|vivo|huawei|honor|oneplus/i.test(a.device || ''));
  
  // 4. Unassigned (Strictly no device string)
  const unassignedGroup = goodAccounts.filter(a => !a.device || a.device.trim() === '');
  
  // 5. Other Devices (Has device but not iOS/Android - e.g., PC, Mac, Emulator)
  const otherDeviceGroup = goodAccounts.filter(a => 
    a.device && a.device.trim() !== '' && 
    !iosGroup.includes(a) && 
    !androidGroup.includes(a)
  );

  const stats = {
    restricted: restrictedGroup.length,
    notSigned: notSignedGroup.length,
    ios: iosGroup.length,
    android: androidGroup.length,
    unassigned: unassignedGroup.length,
    other: otherDeviceGroup.length
  };

  // --- EXPORT FUNCTION ---
  const handleExportVault = () => {
    const dateStr = new Date().toLocaleDateString();

    // 1. Calculate Summary Metrics for Report Header
    const summary = {
        total: accounts.length,
        restricted: accounts.filter(a => /RESTRICTED|BANNED|ISSUE/.test(a.status?.toUpperCase() || '')).length,
        verify: accounts.filter(a => /VERIFY|LOCKED/.test(a.status?.toUpperCase() || '')).length,
        notSigned: accounts.filter(a => /NOT SIGNED/.test(a.status?.toUpperCase() || '')).length,
        good: accounts.filter(a => /GOOD/.test(a.status?.toUpperCase() || '')).length,
        unassigned: accounts.filter(a => !a.device || a.device.trim() === '').length
    };

    // 2. Sort Helper (Sort by Device A-Z)
    const sortByDevice = (a: VaultAccount, b: VaultAccount) => (a.device || '').localeCompare(b.device || '');

    // 3. Prepare Data Groups (Sorted)
    const exportRestricted = [...restrictedGroup].sort(sortByDevice);
    const exportNotSigned = [...notSignedGroup].sort(sortByDevice);
    const exportIos = [...iosGroup].sort(sortByDevice);
    const exportAndroid = [...androidGroup].sort(sortByDevice);
    const exportUnassigned = [...unassignedGroup].sort(sortByDevice);
    const exportOther = [...otherDeviceGroup].sort(sortByDevice);
    
    const generateTable = (title: string, data: VaultAccount[], color: string) => {
        if (data.length === 0) return '';
        const rows = data.map(a => `
            <tr>
                <td style="font-weight:bold;">${a.handle || '-'}</td>
                <td>${a.username}</td>
                <td style="font-family:monospace;">${a.password || ''}</td>
                <td style="font-family:monospace;">${a.secretKey || ''}</td>
                <td style="font-weight:bold; color:#334155;">${a.device || 'N/A'}</td>
                <td><span style="color:${color}; font-weight:bold;">${a.status}</span></td>
                <td style="color:#64748b; font-style:italic;">${a.notes || ''}</td>
            </tr>
        `).join('');

        return `
            <h2 style="color:${color}; border-bottom: 2px solid ${color}; padding-bottom: 10px; margin-top: 30px; font-size: 18px; text-transform: uppercase;">${title} (${data.length})</h2>
            <table>
                <thead>
                    <tr style="background:${color}; color:white;">
                        <th>Username</th>
                        <th>Email</th>
                        <th>Password</th>
                        <th>2FA Secret Key</th>
                        <th>Device</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    };

    const htmlContent = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #fff; }
          h1 { text-align: center; color: #1e293b; margin-bottom: 5px; }
          p.meta { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 30px; }
          
          .summary-box { display: flex; gap: 20px; justify-content: center; margin-bottom: 40px; flex-wrap: wrap; }
          .summary-card { border: 1px solid #e2e8f0; padding: 15px 25px; border-radius: 8px; text-align: center; min-width: 120px; background: #f8fafc; }
          .summary-val { display: block; font-size: 24px; font-weight: bold; color: #0f172a; }
          .summary-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-top: 5px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { padding: 10px; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Global Media Live - Account Vault Report</h1>
        <p class="meta">Generated: ${dateStr}</p>

        <div class="summary-box">
            <div class="summary-card" style="border-bottom: 4px solid #ef4444;">
                <span class="summary-val" style="color:#ef4444">${summary.restricted}</span>
                <span class="summary-label">Restricted / Issues</span>
            </div>
            <div class="summary-card" style="border-bottom: 4px solid #f97316;">
                <span class="summary-val" style="color:#f97316">${summary.verify}</span>
                <span class="summary-label">Needs Verify</span>
            </div>
            <div class="summary-card" style="border-bottom: 4px solid #64748b;">
                <span class="summary-val" style="color:#64748b">${summary.notSigned}</span>
                <span class="summary-label">Not Signed Up</span>
            </div>
            <div class="summary-card" style="border-bottom: 4px solid #10b981;">
                <span class="summary-val" style="color:#10b981">${summary.good}</span>
                <span class="summary-label">Good Accounts</span>
            </div>
            <div class="summary-card" style="border-bottom: 4px solid #8b5cf6;">
                <span class="summary-val" style="color:#8b5cf6">${summary.unassigned}</span>
                <span class="summary-label">Unassigned</span>
            </div>
        </div>
        
        ${generateTable('Restricted & Issues', exportRestricted, '#ef4444')}
        ${generateTable('Not Signed Up', exportNotSigned, '#64748b')}
        ${generateTable('iPhone Devices', exportIos, '#3b82f6')}
        ${generateTable('Android Devices', exportAndroid, '#10b981')}
        ${generateTable('Unassigned Accounts', exportUnassigned, '#8b5cf6')}
        ${generateTable('Other Devices (PC/Web)', exportOther, '#6b7280')}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GML_Vault_Full_Export_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCard = (account: VaultAccount) => {
    const style = getDeviceStyle(account.device);
    const isPasswordVisible = visiblePasswords[account.id];

    return (
      <div key={account.id} className="group relative bg-gray-800 rounded-3xl border border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
         {/* 3D Device Header */}
         <div className={`h-24 bg-gradient-to-br ${style.gradient} relative overflow-hidden p-4 flex flex-col justify-between`}>
            <div className="absolute right-[-15px] top-[-10px] opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-700">{style.icon}</div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex justify-between items-start">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-black/40 backdrop-blur-md ${style.accent} text-white`}>
                   {style.label}
                </span>
                <div className="flex gap-1">
                   <button onClick={() => handleOpenModal(account)} className="p-1.5 bg-black/20 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                   <button onClick={() => handleDelete(account.id, account.username)} className="p-1.5 bg-black/20 hover:bg-red-500/80 rounded-lg text-white/70 hover:text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <div className="relative z-10">
               <h3 className="text-white font-bold text-base truncate drop-shadow-md">{account.device || 'Unassigned'}</h3>
            </div>
         </div>

         {/* Body */}
         <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
               <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Account</p>
                  <div className="font-bold text-white text-sm truncate" title={account.username}>{account.username}</div>
                  {account.handle && <div className="text-xs text-gray-400 truncate">@{account.handle}</div>}
               </div>
               <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getStatusBadge(account.status)}`}>{account.status}</span>
            </div>

            <div className="bg-gray-900 rounded-xl p-2.5 border border-gray-700 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                   <p className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">Password</p>
                   <p className="font-mono text-xs text-gray-300 truncate">{isPasswordVisible ? account.password : '••••••••••••'}</p>
                </div>
                <div className="flex gap-1">
                   <button onClick={() => copyToClipboard(account.password || '')} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded"><Copy className="w-3.5 h-3.5" /></button>
                   <button onClick={() => togglePassword(account.id)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded">{isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                </div>
            </div>

            {account.secretKey ? <TOTPDisplay secret={account.secretKey} /> : <div className="mt-2 text-center text-xs text-gray-600 border border-dashed border-gray-700 p-2 rounded-lg">No 2FA Key</div>}
         </div>
         {account.notes && <div className="px-4 pb-4 pt-0"><p className="text-[10px] text-gray-500 italic truncate border-t border-gray-700/50 pt-2">"{account.notes}"</p></div>}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER DASHBOARD */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
           <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg">
                   <Shield className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Account Vault</h2>
              </div>
              <p className="text-gray-400 text-sm">Secure credentials and device assignment management.</p>
           </div>
           
           <div className="flex gap-3">
              <button 
                onClick={handleExportVault} 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
              >
                 <FileSpreadsheet className="w-5 h-5"/> Export Full Vault
              </button>
              <button 
                onClick={() => handleOpenModal()} 
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all hover:scale-105 active:scale-95"
              >
                 <Plus className="w-5 h-5"/> Add Account
              </button>
           </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {/* Card 1: Restricted */}
            <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-red-900/20">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1 text-center">Restricted / Issues</span>
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-2xl font-bold text-white">{stats.restricted}</span>
                </div>
            </div>
            {/* Card 2: Not Signed Up */}
            <div className="bg-gray-700/20 border border-gray-600/30 p-4 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-gray-700/30">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-center">Not Signed Up</span>
                <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-gray-400" />
                    <span className="text-2xl font-bold text-white">{stats.notSigned}</span>
                </div>
            </div>
            {/* Card 3: iPhone */}
            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-blue-900/20">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 text-center">iPhones</span>
                <div className="flex items-center gap-2">
                    <Apple className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold text-white">{stats.ios}</span>
                </div>
            </div>
            {/* Card 4: Android */}
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-emerald-900/20">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 text-center">Androids</span>
                <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-500" />
                    <span className="text-2xl font-bold text-white">{stats.android}</span>
                </div>
            </div>
            {/* Card 5: Unassigned */}
            <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-purple-900/20">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1 text-center">Unassigned</span>
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-500" />
                    <span className="text-2xl font-bold text-white">{stats.unassigned}</span>
                </div>
            </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 border-t border-gray-700 pt-4">
           {/* Search Input with Mode */}
           <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input 
                     type="text" 
                     placeholder={searchMode === 'start' ? 'Username starts with...' : searchMode === 'end' ? 'Username ends with...' : 'Search accounts...'} 
                     className="w-full bg-gray-900 border border-gray-600 text-white pl-9 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm shadow-inner"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              
              {/* Search Mode Selector */}
              <div className="relative bg-gray-900 border border-gray-600 rounded-xl flex items-center px-2">
                 <Filter className="w-4 h-4 text-gray-400 mr-2" />
                 <select 
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as any)}
                    className="bg-transparent text-gray-300 text-sm font-medium focus:outline-none appearance-none pr-6 py-2 cursor-pointer"
                 >
                    <option value="contains">Contains</option>
                    <option value="start">Starts With</option>
                    <option value="end">Ends With</option>
                 </select>
                 <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 pointer-events-none" />
              </div>
           </div>

           {/* Stats / Toggles - Kept as Filters/Toggles */}
           <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSections({ ...sections, restricted: !sections.restricted })} className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-colors ${sections.restricted ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                Restricted ({stats.restricted})
              </button>
              <button onClick={() => setSections({ ...sections, notSigned: !sections.notSigned })} className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-colors ${sections.notSigned ? 'bg-gray-700/50 text-gray-300 border-gray-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                Not Signed Up ({stats.notSigned})
              </button>
              <button onClick={() => setSections({ ...sections, ios: !sections.ios })} className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-colors ${sections.ios ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                iOS ({stats.ios})
              </button>
              <button onClick={() => setSections({ ...sections, android: !sections.android })} className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-colors ${sections.android ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                Android ({stats.android})
              </button>
              <button onClick={() => setSections({ ...sections, unassigned: !sections.unassigned })} className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-colors ${sections.unassigned ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                Unassigned ({stats.unassigned})
              </button>
              {stats.other > 0 && (
                <button onClick={() => setSections({ ...sections, other: !sections.other })} className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-colors ${sections.other ? 'bg-gray-700 text-gray-300 border-gray-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                    Other ({stats.other})
                </button>
              )}
           </div>
        </div>
      </div>

      {/* SEGREGATED SECTIONS */}
      <div className="space-y-6">
         
         {/* 1. RESTRICTED / ISSUES */}
         {sections.restricted && stats.restricted > 0 && (
            <div className="space-y-3">
               <button onClick={() => setSections(prev => ({...prev, restricted: !prev.restricted}))} className="flex items-center gap-3 w-full text-left group">
                  <ChevronDown className="w-5 h-5 text-red-500" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                     <AlertTriangle className="w-4 h-4 text-red-500" />
                     <span className="text-sm font-bold text-red-400 uppercase tracking-wide">Restricted / Issues ({stats.restricted})</span>
                  </div>
                  <div className="h-px bg-red-900/30 flex-1"></div>
               </button>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-4 border-l-2 border-red-900/30 ml-2 animate-in slide-in-from-left-2">
                  {restrictedGroup.map(renderCard)}
               </div>
            </div>
         )}

         {/* 2. NOT SIGNED UP */}
         {sections.notSigned && stats.notSigned > 0 && (
            <div className="space-y-3">
               <button onClick={() => setSections(prev => ({...prev, notSigned: !prev.notSigned}))} className="flex items-center gap-3 w-full text-left group">
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/30 border border-gray-600/30 group-hover:bg-gray-700/50 transition-colors">
                     <UserX className="w-4 h-4 text-gray-400" />
                     <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">Not Signed Up ({stats.notSigned})</span>
                  </div>
                  <div className="h-px bg-gray-700 flex-1"></div>
               </button>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-4 border-l-2 border-gray-700 ml-2 animate-in slide-in-from-left-2">
                  {notSignedGroup.map(renderCard)}
               </div>
            </div>
         )}

         {/* 3. iOS SECTION */}
         {sections.ios && (
            <div className="space-y-3">
                <button onClick={() => setSections(prev => ({...prev, ios: !prev.ios}))} className="flex items-center gap-3 w-full text-left group">
                {sections.ios ? <ChevronDown className="w-5 h-5 text-blue-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent group-hover:bg-gray-800 transition-colors">
                    <Apple className="w-5 h-5 text-gray-200" />
                    <span className="text-sm font-bold text-gray-200 uppercase tracking-wide">iPhone Devices ({stats.ios})</span>
                </div>
                <div className="h-px bg-gray-700 flex-1"></div>
                </button>
                {sections.ios && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-4 border-l-2 border-gray-800 ml-2 animate-in slide-in-from-left-2">
                    {iosGroup.map(renderCard)}
                    {iosGroup.length === 0 && <div className="text-sm text-gray-500 italic p-2">No active iOS devices found.</div>}
                </div>
                )}
            </div>
         )}

         {/* 4. ANDROID SECTION */}
         {sections.android && (
            <div className="space-y-3">
                <button onClick={() => setSections(prev => ({...prev, android: !prev.android}))} className="flex items-center gap-3 w-full text-left group">
                {sections.android ? <ChevronDown className="w-5 h-5 text-emerald-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent group-hover:bg-gray-800 transition-colors">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-gray-200 uppercase tracking-wide">Android Devices ({stats.android})</span>
                </div>
                <div className="h-px bg-gray-700 flex-1"></div>
                </button>
                {sections.android && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-4 border-l-2 border-gray-800 ml-2 animate-in slide-in-from-left-2">
                    {androidGroup.map(renderCard)}
                    {androidGroup.length === 0 && <div className="text-sm text-gray-500 italic p-2">No active Android devices found.</div>}
                </div>
                )}
            </div>
         )}

         {/* 5. UNASSIGNED */}
         {sections.unassigned && (
            <div className="space-y-3">
                <button onClick={() => setSections(prev => ({...prev, unassigned: !prev.unassigned}))} className="flex items-center gap-3 w-full text-left group">
                {sections.unassigned ? <ChevronDown className="w-5 h-5 text-purple-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent group-hover:bg-gray-800 transition-colors">
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-bold text-gray-200 uppercase tracking-wide">Unassigned Accounts ({stats.unassigned})</span>
                </div>
                <div className="h-px bg-gray-700 flex-1"></div>
                </button>
                {sections.unassigned && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-4 border-l-2 border-gray-800 ml-2 animate-in slide-in-from-left-2">
                    {unassignedGroup.map(renderCard)}
                    {unassignedGroup.length === 0 && <div className="text-sm text-gray-500 italic p-2">All accounts have devices assigned.</div>}
                </div>
                )}
            </div>
         )}

         {/* 6. OTHER DEVICES */}
         {sections.other && stats.other > 0 && (
            <div className="space-y-3">
                <button onClick={() => setSections(prev => ({...prev, other: !prev.other}))} className="flex items-center gap-3 w-full text-left group">
                {sections.other ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent group-hover:bg-gray-800 transition-colors">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-bold text-gray-200 uppercase tracking-wide">Other Devices ({stats.other})</span>
                </div>
                <div className="h-px bg-gray-700 flex-1"></div>
                </button>
                {sections.other && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-4 border-l-2 border-gray-800 ml-2 animate-in slide-in-from-left-2">
                    {otherDeviceGroup.map(renderCard)}
                </div>
                )}
            </div>
         )}
      </div>

      {/* Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
               <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     {editingAccount ? <Edit2 className="w-5 h-5 text-blue-400"/> : <Plus className="w-5 h-5 text-green-400"/>}
                     {editingAccount ? 'Edit Account' : 'New Vault Entry'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Device Name</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. iPhone 13 Pro" value={formData.device} onChange={e => setFormData({...formData, device: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                        <select className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                           <option>GOOD ACC.</option>
                           <option>NEEDS VERIFY</option>
                           <option>RESTRICTED</option>
                           <option>NOT SIGNED UP</option>
                           <option>BANNED</option>
                        </select>
                     </div>
                  </div>
                  
                  {/* SPLIT EMAIL AND USERNAME */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Mail className="w-3 h-3"/> Email</label>
                        <input required type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="email@example.com" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Username</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="@handle" value={formData.handle} onChange={e => setFormData({...formData, handle: e.target.value})} />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Password</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Email Pass (Opt)</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono" value={formData.emailPassword} onChange={e => setFormData({...formData, emailPassword: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Key className="w-3 h-3"/> 2FA Secret Key <span className="text-gray-600 normal-case font-normal">(Base32)</span></label>
                     <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-xs tracking-wide" placeholder="JBSWY3DPEHPK3PXP" value={formData.secretKey} onChange={e => setFormData({...formData, secretKey: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-gray-400 uppercase">Notes</label>
                     <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="Additional details..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                  </div>
                  <div className="flex justify-end pt-2 gap-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-400 font-bold hover:text-white transition-colors">Cancel</button>
                     <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-transform active:scale-95">Save Account</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default AccountVault;
