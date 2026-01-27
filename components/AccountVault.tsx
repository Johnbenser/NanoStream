import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Lock, Copy, Eye, EyeOff, Shield, Check, X, Smartphone, Mail, ShieldCheck, AlertTriangle, AtSign, Grid, Wifi, Battery, Signal, Activity } from 'lucide-react';
import * as OTPAuth from 'otpauth';
import { VaultAccount } from '../types';
import { subscribeToVault, saveVaultAccount, deleteVaultAccount } from '../services/storageService';

// --- SUB-COMPONENT: 3D PHONE ---
const PhoneDevice: React.FC<{
    name: string;
    type: 'ios' | 'android';
    accounts: VaultAccount[];
    currentTime: Date;
    onOpenAccount: (acc?: VaultAccount) => void;
}> = ({ name, type, accounts, currentTime, onOpenAccount }) => {
    const [isLocked, setIsLocked] = useState(true);
    const isAndroid = type === 'android';

    // Detect Platform for Styling
    const getAppStyle = (handle: string) => {
        const h = handle.toLowerCase();
        if (h.includes('tiktok') || h.includes('tik')) return { bg: 'bg-black', icon: '🎵', color: 'text-white' };
        if (h.includes('insta') || h.includes('ig')) return { bg: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600', icon: '📸', color: 'text-white' };
        if (h.includes('youtube') || h.includes('yt')) return { bg: 'bg-red-600', icon: '▶️', color: 'text-white' };
        if (h.includes('mail') || h.includes('@')) return { bg: 'bg-blue-500', icon: '✉️', color: 'text-white' };
        return { bg: 'bg-gray-700', icon: '🔐', color: 'text-gray-200' };
    };

    return (
        <div className="perspective-1000 shrink-0">
            <div 
                className={`relative w-[320px] h-[680px] ${isAndroid ? 'bg-slate-900 rounded-[2.5rem] border-slate-700' : 'bg-gray-900 rounded-[3.5rem] border-gray-600'} shadow-2xl border-4 ring-2 ring-black transform-gpu transition-transform duration-500 group hover:rotate-y-6 mx-auto`}
                style={{ 
                    boxShadow: '0 0 0 10px #1f2937, 0 30px 60px rgba(0,0,0,0.5)',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* Device Buttons */}
                <div className={`absolute top-32 -left-3 w-1 h-16 ${isAndroid ? 'bg-slate-700' : 'bg-gray-700'} rounded-l-md shadow-inner`}></div>
                <div className={`absolute top-52 -left-3 w-1 h-16 ${isAndroid ? 'bg-slate-700' : 'bg-gray-700'} rounded-l-md shadow-inner`}></div>
                <div className={`absolute top-40 -right-3 w-1 h-24 ${isAndroid ? 'bg-slate-700' : 'bg-gray-700'} rounded-r-md shadow-inner`}></div>

                {/* Camera / Notch Area */}
                {isAndroid ? (
                    // Android Punch Hole
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-30 flex items-center justify-center shadow-inner border border-gray-800/50 pointer-events-none">
                        <div className="w-1.5 h-1.5 bg-gray-800/50 rounded-full blur-[0.5px]"></div>
                    </div>
                ) : (
                    // iOS Dynamic Island
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30 flex items-center justify-center gap-2 pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-800/50 blur-[1px]"></div>
                        <div className="w-10 h-1.5 rounded-full bg-gray-800/50 blur-[1px]"></div>
                    </div>
                )}

                {/* Screen Content */}
                <div 
                    className={`w-full h-full bg-black ${isAndroid ? 'rounded-[2.2rem]' : 'rounded-[3.2rem]'} overflow-hidden relative`}
                    onClick={() => isLocked && setIsLocked(false)}
                >
                    {/* Status Bar */}
                    <div className="absolute top-3.5 w-full px-7 flex justify-between items-center text-white text-[10px] font-bold z-20 mix-blend-difference pointer-events-none">
                        <span>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}</span>
                        <div className="flex gap-1.5 items-center">
                            <Signal className="w-3 h-3" />
                            <Wifi className="w-3 h-3" />
                            <Battery className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Lock Screen Layer */}
                    <div 
                        className={`absolute inset-0 bg-cover bg-center z-10 flex flex-col items-center pt-24 transition-transform duration-700 ease-in-out cursor-pointer ${isLocked ? 'translate-y-0' : '-translate-y-full'}`}
                        style={{ backgroundImage: isAndroid ? 'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop")' : 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop")', backgroundColor: '#111' }}
                    >
                        <div className="flex flex-col items-center text-white/90 drop-shadow-lg mt-8">
                            {/* Logo SVG Replacement for Lock Icon */}
                            <div className="mb-4 opacity-90 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
                                </svg>
                            </div>
                            <div className={`font-thin tracking-tighter ${isAndroid ? 'text-7xl font-sans' : 'text-6xl'}`}>
                                {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
                            </div>
                            <div className="text-lg font-medium mt-1">
                                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                            
                            {/* DEVICE LABEL ON LOCK SCREEN (High Visibility) */}
                            <div className="mt-8 px-6 py-2.5 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/20 shadow-[0_0_25px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-300">
                                <span className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                    {name}
                                </span>
                            </div>
                        </div>

                        <div className="mt-auto mb-10 animate-bounce text-white/70 text-[10px] font-bold uppercase tracking-widest drop-shadow-md">
                            Swipe up to open
                        </div>
                        
                        {/* Lock Screen Shortcuts */}
                        <div className="absolute bottom-10 w-full px-10 flex justify-between">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-colors">
                                <div className="w-5 h-5 bg-white rounded-full opacity-80 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-colors">
                                <div className="w-5 h-5 border-2 border-white rounded-full opacity-80 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Home Screen (App Grid) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black pt-16 px-5 pb-20 overflow-y-auto custom-scrollbar">
                        <h3 className="text-white font-bold text-lg mb-6 text-center drop-shadow-md uppercase tracking-wider">{name}</h3>
                        
                        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                            {accounts.map(acc => {
                                const style = getAppStyle(acc.platform);
                                return (
                                    <button 
                                        key={acc.id}
                                        onClick={() => onOpenAccount(acc)}
                                        className="flex flex-col items-center gap-1 group/app focus:outline-none"
                                    >
                                        <div className={`w-12 h-12 ${isAndroid ? 'rounded-[1.2rem]' : 'rounded-xl'} ${style.bg} flex items-center justify-center text-2xl shadow-lg group-hover/app:scale-105 transition-transform border border-white/10 relative`}>
                                            {style.icon}
                                            {acc.status === 'RESTRICTED FROM SELLING' && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black flex items-center justify-center">
                                                    <span className="text-[8px] text-white font-bold">!</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-white font-semibold truncate w-full text-center px-0.5 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                            {acc.platform}
                                        </span>
                                    </button>
                                );
                            })}
                            {/* Add Button as App */}
                            <button 
                                onClick={() => onOpenAccount()}
                                className="flex flex-col items-center gap-1 group/app focus:outline-none"
                            >
                                <div className={`w-12 h-12 ${isAndroid ? 'rounded-[1.2rem]' : 'rounded-xl'} bg-gray-700 flex items-center justify-center text-white shadow-lg group-hover/app:scale-105 transition-transform border border-white/10`}>
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-[9px] text-gray-400 font-medium">Add New</span>
                            </button>
                        </div>

                        {/* Dock */}
                        <div className={`absolute bottom-3 left-3 right-3 h-18 bg-white/10 backdrop-blur-xl ${isAndroid ? 'rounded-2xl' : 'rounded-[1.8rem]'} flex items-center justify-around px-1 border border-white/5 py-3`}>
                            <div className={`w-11 h-11 ${isAndroid ? 'rounded-xl' : 'rounded-xl'} bg-green-500 flex items-center justify-center text-xl shadow-lg`}>📞</div>
                            <div className={`w-11 h-11 ${isAndroid ? 'rounded-xl' : 'rounded-xl'} bg-blue-500 flex items-center justify-center text-xl shadow-lg`}>🌐</div>
                            <div className={`w-11 h-11 ${isAndroid ? 'rounded-xl' : 'rounded-xl'} bg-gray-800 flex items-center justify-center text-xl shadow-lg`}>⚙️</div>
                            <div className={`w-11 h-11 ${isAndroid ? 'rounded-xl' : 'rounded-xl'} bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shadow-lg`}>🎵</div>
                        </div>
                    </div>
                    
                    {/* Lock Button (To re-lock) */}
                    {!isLocked && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsLocked(true); }}
                            className="absolute top-2 left-4 text-white/50 hover:text-white z-40 p-2"
                            title="Lock Phone"
                        >
                            <Lock className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Floor Shadow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-4 bg-black/40 blur-xl rounded-[100%] translate-y-6"></div>
        </div>
    );
};

const AccountVault: React.FC = () => {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'device'>('grid');
  
  const [tick, setTick] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(new Date());

  const [formData, setFormData] = useState<Partial<VaultAccount>>({
    platform: '',
    username: '',
    password: '',
    emailPassword: '',
    secretKey: '',
    notes: '',
    status: 'GOOD ACC.'
  });
  
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToVault(
      (data) => setAccounts(data),
      (error) => console.error("Vault sync error:", error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenModal = (account?: VaultAccount) => {
    if (account) {
      setEditingId(account.id);
      setFormData({
        platform: account.platform,
        username: account.username,
        password: account.password || '',
        emailPassword: account.emailPassword || '',
        secretKey: account.secretKey || '',
        notes: account.notes || '',
        status: account.status || 'GOOD ACC.'
      });
    } else {
      setEditingId(null);
      setFormData({
        platform: '',
        username: '',
        password: '',
        emailPassword: '',
        secretKey: '',
        notes: '',
        status: 'GOOD ACC.'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanSecret = formData.secretKey ? formData.secretKey.replace(/\s/g, '').toUpperCase() : '';
      await saveVaultAccount({
        ...formData,
        secretKey: cleanSecret
      } as any, editingId || undefined);
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save account.");
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (window.confirm(`Delete credentials for ${username}?`)) {
      await deleteVaultAccount(id, username);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const getTotpData = (secret: string) => {
    try {
      if (!secret) return null;
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });
      const token = totp.generate();
      const epoch = Math.floor(Date.now() / 1000);
      const period = 30;
      const remaining = period - (epoch % period);
      const progress = (remaining / period) * 100;
      return { token, remaining, progress };
    } catch (e) {
      return null; 
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.notes && acc.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- GROUP ACCOUNTS BY DEVICE (Parsed from Notes) ---
  const deviceGroups = useMemo(() => {
      const groups: Record<string, { id: string, accounts: VaultAccount[], type: 'ios' | 'android', sortOrder: number }> = {};
      
      filteredAccounts.forEach(acc => {
          const notes = (acc.notes || '').toLowerCase().trim();
          
          // FILTER: Skip empty notes or "not yet logged in"
          if (!notes || notes.includes('not yet logged in')) {
              return;
          }
          
          const isAndroid = notes.includes('redmi') || notes.includes('android');
          
          // Extract number: looks for "#7", "Phone 7", "Device 7", "iPhone 7", "Phone # 7"
          const numberMatch = notes.match(/(?:iphone|phone|device|#)\s*#?\s*(\d+)/i);
          let extractedNum = numberMatch ? parseInt(numberMatch[1]) : null;

          if (isAndroid) {
              // Android Logic
              let id = '';
              let sortOrder = 0;

              // 1. Explicit Numbering in Note
              if (extractedNum !== null) {
                  id = `android_${extractedNum}`;
                  sortOrder = 1000 + extractedNum; // Keep Androids after iPhones (which are 1-999)
              } 
              // 2. Keyword Fallback (Legacy mappings from previous prompts)
              else if (notes.includes('nelson')) {
                  id = `android_7`; // Map Nelson to #7
                  sortOrder = 1007;
              } else if (notes.includes('tiktok') && notes.includes('redmi')) {
                  id = `android_8`; // Map TikTok phone to #8
                  sortOrder = 1008;
              } else {
                  // 3. Unidentified Android
                  id = `android_misc_${acc.id}`;
                  sortOrder = 2000 + (acc.updatedAt ? new Date(acc.updatedAt).getTime() : 0);
              }

              if (!groups[id]) {
                  groups[id] = { id, accounts: [], type: 'android', sortOrder };
              }
              groups[id].accounts.push(acc);

          } else {
              // iOS Logic (Default)
              let id = 'iphone_1';
              let sortOrder = 1;

              if (extractedNum !== null) {
                  id = `iphone_${extractedNum}`;
                  sortOrder = extractedNum;
              } else {
                  // Fallback for just "iPhone" without number -> maybe iPhone 1?
                  id = 'iphone_1';
                  sortOrder = 1;
              }

              if (!groups[id]) {
                  groups[id] = { id, accounts: [], type: 'ios', sortOrder };
              }
              groups[id].accounts.push(acc);
          }
      });

      const sortedGroups = Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);

      // Final Map to Display Names
      return sortedGroups.map(g => {
          let name = '';
          if (g.type === 'ios') {
              const num = g.id.replace('iphone_', '');
              name = `iPhone #${num}`;
          } else {
              if (g.id.startsWith('android_misc')) {
                  name = 'Android Device';
              } else {
                  const num = g.id.replace('android_', '');
                  name = `Android Phone #${num}`;
              }
          }
          return { name, accounts: g.accounts, type: g.type };
      });

  }, [filteredAccounts]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        {/* Header */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Shield className="w-6 h-6 text-emerald-400" />
                 Secure Account Vault
               </h2>
               <p className="text-gray-400 text-sm mt-1">
                 Encrypted storage for social media credentials and 2FA keys.
               </p>
            </div>
            
            <div className="flex w-full md:w-auto gap-3 items-center">
               <div className="bg-gray-900 p-1 rounded-lg border border-gray-700 flex">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    title="Grid View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('device')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'device' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    title="Device View"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
               </div>

               <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                      type="text"
                      placeholder="Search accounts..."
                      className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <button 
                 onClick={() => handleOpenModal()}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all whitespace-nowrap"
               >
                 <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
               </button>
            </div>
        </div>

        {/* --- VIEW MODE SWITCHER --- */}
        
        {viewMode === 'grid' ? (
            /* STANDARD GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map(account => {
                    const totpData = account.secretKey ? getTotpData(account.secretKey) : null;

                    return (
                    <div key={account.id} className="bg-gray-800 rounded-xl border border-gray-700 hover:border-emerald-500/30 transition-all group overflow-hidden flex flex-col shadow-lg">
                        <div className="p-5 border-b border-gray-700 bg-gray-900/30 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-white tracking-wide">{account.platform || 'Untitled'}</h3>
                                {account.status && (
                                    <div className={`text-[10px] font-bold px-2 py-1 rounded inline-block mt-1 border ${
                                        account.status === 'GOOD ACC.' ? 'bg-green-900/20 text-green-400 border-green-500/30' :
                                        account.status === 'RESTRICTED FROM SELLING' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                        'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                        {account.status}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleOpenModal(account)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(account.id, account.platform)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        <div className="p-5 space-y-4 flex-1">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3"/> Email Address</label>
                                <div className="flex items-center gap-2 bg-gray-900 p-2 rounded border border-gray-700">
                                    <span className="text-sm text-gray-300 flex-1 font-mono truncate">{account.username}</span>
                                    <button onClick={() => copyToClipboard(account.username, `${account.id}-user`)} className="text-gray-500 hover:text-white">
                                        {copiedId === `${account.id}-user` ? <Check className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3"/>}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><Lock className="w-3 h-3"/> TikTok Password</label>
                                <div className="flex items-center gap-2 bg-gray-900 p-2 rounded border border-gray-700">
                                    <input 
                                        type={visiblePasswords.has(`${account.id}-main`) ? "text" : "password"} 
                                        readOnly 
                                        value={account.password || ''}
                                        className="bg-transparent text-sm text-gray-300 flex-1 outline-none font-mono"
                                    />
                                    <button onClick={() => toggleVisibility(`${account.id}-main`)} className="text-gray-500 hover:text-white">
                                        {visiblePasswords.has(`${account.id}-main`) ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                                    </button>
                                    <button onClick={() => copyToClipboard(account.password || '', `${account.id}-pass`)} className="text-emerald-500 hover:text-emerald-400">
                                        {copiedId === `${account.id}-pass` ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                                    </button>
                                </div>
                            </div>

                            {account.emailPassword && (
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> EMAIL PASSWORD</label>
                                    <div className="flex items-center gap-2 bg-gray-900 p-2 rounded border border-gray-700">
                                        <input 
                                            type={visiblePasswords.has(`${account.id}-email`) ? "text" : "password"} 
                                            readOnly 
                                            value={account.emailPassword}
                                            className="bg-transparent text-sm text-gray-300 flex-1 outline-none font-mono"
                                        />
                                        <button onClick={() => toggleVisibility(`${account.id}-email`)} className="text-gray-500 hover:text-white">
                                            {visiblePasswords.has(`${account.id}-email`) ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                                        </button>
                                        <button onClick={() => copyToClipboard(account.emailPassword || '', `${account.id}-email`)} className="text-emerald-500 hover:text-emerald-400">
                                            {copiedId === `${account.id}-email` ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {account.secretKey ? (
                                totpData ? (
                                    <div className="mt-4 bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div className="flex items-center gap-2 text-emerald-400">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">2FA Code</span>
                                            </div>
                                            <div className="text-[10px] text-emerald-500/80 font-mono">
                                                {totpData.remaining}s
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-end relative z-10">
                                            <div className="text-3xl font-mono font-bold text-white tracking-widest">
                                                {totpData.token.slice(0,3)} <span className="text-gray-500 text-xl mx-1">-</span> {totpData.token.slice(3)}
                                            </div>
                                            <button 
                                                onClick={() => copyToClipboard(totpData.token, `${account.id}-2fa`)}
                                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400 rounded-lg transition-all"
                                            >
                                                {copiedId === `${account.id}-2fa` ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                                            </button>
                                        </div>

                                        <div 
                                            className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-1000 ease-linear"
                                            style={{ width: `${totpData.progress}%` }}
                                        ></div>
                                    </div>
                                ) : (
                                    <div className="mt-4 bg-red-900/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                                        <AlertTriangle className="w-4 h-4" /> Invalid Secret Key
                                    </div>
                                )
                            ) : (
                                <div className="mt-4 border border-dashed border-gray-700 rounded-lg p-3 text-center">
                                    <p className="text-xs text-gray-500">No 2FA configured.</p>
                                </div>
                            )}

                            {account.notes && (
                                <div className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded border border-gray-700/50 italic mt-2">
                                    {account.notes}
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>
        ) : (
            /* --- 3D DEVICE VIEW (Multi-Device) --- */
            <div className="py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-x-8 gap-y-16 w-full max-w-6xl mx-auto place-items-center">
                    {deviceGroups.map((group) => (
                        <PhoneDevice 
                            key={group.name}
                            name={group.name}
                            type={group.type}
                            accounts={group.accounts}
                            currentTime={currentTime}
                            onOpenAccount={handleOpenModal}
                        />
                    ))}
                    {deviceGroups.length === 0 && (
                        <div className="text-gray-500 flex flex-col items-center justify-center w-[320px] h-[680px] border-2 border-dashed border-gray-700 rounded-[3.5rem] col-span-full">
                            <Smartphone className="w-16 h-16 mb-4 opacity-20" />
                            <p>No devices found.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {editingId ? <Edit2 className="w-5 h-5 text-emerald-400"/> : <Plus className="w-5 h-5 text-emerald-400"/>}
                            {editingId ? 'Edit Credentials' : 'Add New Account'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                <Activity className="w-3 h-3 text-emerald-400" /> Account Status
                            </label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.status || 'GOOD ACC.'}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option>GOOD ACC.</option>
                                <option>RESTRICTED FROM SELLING</option>
                                <option>RECONSTRUCTING/ALGO. TRAIN</option>
                                <option>OTHER</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* USERNAME (Mapped to Platform) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <AtSign className="w-3 h-3" /> Username (Handle)
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="@tiktok_user"
                                    value={formData.platform}
                                    onChange={e => setFormData({...formData, platform: e.target.value})}
                                />
                            </div>
                            
                            {/* EMAIL (Mapped to Username) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Email
                                </label>
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="user@example.com"
                                    value={formData.username} 
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">TikTok Password</label>
                            <input 
                                type="text" 
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                placeholder="Main password"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Email Password</label>
                            <input 
                                type="text" 
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                value={formData.emailPassword} 
                                onChange={e => setFormData({...formData, emailPassword: e.target.value})}
                                placeholder="Secondary password for email access"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-purple-400 uppercase">2FA Secret Key (TOTP)</label>
                            <input 
                                type="text" 
                                className="w-full bg-purple-900/10 border border-purple-500/30 text-white rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                                value={formData.secretKey} 
                                onChange={e => setFormData({...formData, secretKey: e.target.value})}
                                placeholder="e.g. JBSWY3DPEHPK3PXP"
                            />
                            <p className="text-[10px] text-gray-500">Paste the setup key provided by the platform for authenticator apps.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Notes</label>
                            <textarea 
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                value={formData.notes} 
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                placeholder="Example: Device iPhone 4, Recovery codes..."
                            />
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-gray-700">
                            {editingId && (
                                <button 
                                    type="button"
                                    onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete ${formData.platform || 'this account'}? This cannot be undone.`)) {
                                            await deleteVaultAccount(editingId, formData.username || 'Unknown');
                                            setIsModalOpen(false);
                                        }
                                    }}
                                    className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Account
                                </button>
                            )}
                            
                            <div className={`flex gap-3 ${!editingId ? 'ml-auto' : ''}`}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg">Save Credentials</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AccountVault;