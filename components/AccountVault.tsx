
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Lock, Eye, EyeOff, Copy, Check, 
  AlertTriangle, CheckCircle, Apple, MonitorSmartphone, Grid, LayoutGrid, Box,
  Battery, Signal, Wifi, ChevronLeft, ChevronRight, ChevronDown, MoreVertical, Mail, GripHorizontal, Laptop,
  Smartphone, Fingerprint, User, Filter, FileSpreadsheet, X, AtSign, AlertCircle
} from 'lucide-react';
import { VaultAccount } from '../types';
import { subscribeToVault, saveVaultAccount, deleteVaultAccount, subscribeToDeviceOrder, saveDeviceOrder } from '../services/storageService';

interface AccountVaultProps {
  currentUser?: string;
}

const AccountVault: React.FC<AccountVaultProps> = ({ currentUser }) => {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'devices'>('list');
  
  // Advanced Filters
  const [emailStartChar, setEmailStartChar] = useState('');
  const [emailEndChar, setEmailEndChar] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Collapsible Sections State
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Device Sorting State (Synced with Firestore)
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Omit<VaultAccount, 'id' | 'updatedAt'>>({
    username: '',
    handle: '',
    password: '',
    emailPassword: '',
    secretKey: '',
    notes: '',
    device: '',
    status: 'GOOD ACC.',
    customOrder: 0
  });

  useEffect(() => {
    const unsubscribeVault = subscribeToVault(setAccounts);
    const unsubscribeOrder = subscribeToDeviceOrder(setSavedOrder);
    return () => {
      unsubscribeVault();
      unsubscribeOrder();
    };
  }, []);

  // Derive unique devices list for autocomplete
  const existingDevices = useMemo(() => {
    const devices = new Set<string>();
    accounts.forEach(acc => {
      if (acc.device) devices.add(acc.device);
    });
    return Array.from(devices).sort();
  }, [accounts]);

  const filteredAccounts = accounts.filter(acc => {
    // 1. General Search
    const matchesGeneral = 
      acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.handle && acc.handle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.platform && acc.platform.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (acc.notes && acc.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.device && acc.device.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.customOrder !== undefined && String(acc.customOrder).includes(searchTerm));
    
    if (!matchesGeneral) return false;

    // 2. Email Prefix/Suffix Filter
    if (emailStartChar) {
        if (!acc.username.toLowerCase().startsWith(emailStartChar.toLowerCase())) return false;
    }
    
    if (emailEndChar) {
        const usernamePart = acc.username.split('@')[0].toLowerCase();
        if (!usernamePart.endsWith(emailEndChar.toLowerCase())) return false;
    }

    return true;
  });

  // --- DEVICE SEGREGATION LOGIC (For List View & Sorting) ---
  const getDeviceType = (deviceName: string = '') => {
    const n = deviceName.toLowerCase();
    if (n.includes('iphone') || n.includes('ios') || n.includes('apple') || n.includes('ipad')) return 'iphone';
    if (n.includes('android') || n.includes('samsung') || n.includes('pixel') || n.includes('redmi') || n.includes('xiaomi') || n.includes('oppo') || n.includes('vivo') || n.includes('realme')) return 'android';
    return 'other';
  };

  const categorizedData = useMemo(() => {
    const groups = {
      restricted: [] as VaultAccount[],
      iphone: [] as VaultAccount[],
      android: [] as VaultAccount[],
      other: [] as VaultAccount[]
    };

    filteredAccounts.forEach(acc => {
      if (acc.status !== 'GOOD ACC.') {
        groups.restricted.push(acc);
      } else {
        const type = getDeviceType(acc.device || acc.notes); 
        groups[type].push(acc);
      }
    });
    
    Object.values(groups).forEach(group => {
        group.sort((a, b) => (a.customOrder || 9999) - (b.customOrder || 9999));
    });

    return groups;
  }, [filteredAccounts]);

  // --- RAW GROUPS (FULL LIST) ---
  // Derived from ALL accounts to ensure the sort order list tracks every device, 
  // even those currently hidden by filters.
  const allDeviceGroups = useMemo(() => {
    const groupMap = new Map<string, { displayName: string; accounts: VaultAccount[] }>();
    
    accounts.forEach(acc => {
        const rawDevice = acc.device ? acc.device.trim() : '';
        let normalizedKey = '';
        let displayName = '';

        if (!rawDevice) {
            normalizedKey = 'unassigned';
            displayName = 'Unassigned Accounts';
        } else {
            normalizedKey = rawDevice.toLowerCase().replace(/\s+/g, ' ');
            displayName = rawDevice; 
        }
        
        if (!groupMap.has(normalizedKey)) {
            groupMap.set(normalizedKey, { displayName, accounts: [] });
        }
        
        groupMap.get(normalizedKey)!.accounts.push(acc);
    });
    return groupMap;
  }, [accounts]);

  // --- VISIBILITY CHECK ---
  // Which groups have at least one account matching the current filters?
  const visibleDeviceKeys = useMemo(() => {
      const keys = new Set<string>();
      filteredAccounts.forEach(acc => {
        const rawDevice = acc.device ? acc.device.trim() : '';
        let key = '';
        if (!rawDevice) key = 'unassigned';
        else key = rawDevice.toLowerCase().replace(/\s+/g, ' ');
        keys.add(key);
      });
      return keys;
  }, [filteredAccounts]);

  // --- MASTER ORDER ---
  const masterDeviceOrder = useMemo(() => {
      const currentKeys = Array.from(allDeviceGroups.keys());
      
      // 1. Keep existing saved order for keys that are still present
      const existingOrder = savedOrder.filter(key => currentKeys.includes(key));
      
      // 2. Add any new keys that weren't in the saved order
      const newKeys = currentKeys.filter(key => !savedOrder.includes(key));
      
      // Sort new keys by standard logic
      newKeys.sort((a, b) => {
          const nameA = allDeviceGroups.get(a)?.displayName || a;
          const nameB = allDeviceGroups.get(b)?.displayName || b;
          if (nameA === 'Unassigned Accounts') return 1;
          if (nameB === 'Unassigned Accounts') return -1;
          const typeA = getDeviceType(nameA);
          const typeB = getDeviceType(nameB);
          const priority: Record<string, number> = { 'iphone': 1, 'android': 2, 'other': 3 };
          if (priority[typeA] !== priority[typeB]) return priority[typeA] - priority[typeB];
          return nameA.localeCompare(nameB);
      });

      return [...existingOrder, ...newKeys];
  }, [allDeviceGroups, savedOrder]);

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;

      const newOrder = [...masterDeviceOrder];
      const [movedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dropIndex, 0, movedItem);

      // Optimistic update
      setSavedOrder(newOrder); 
      setDraggedIndex(null);
      
      // Persist
      await saveDeviceOrder(newOrder);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
        const next = new Set(prev);
        if (next.has(section)) next.delete(section);
        else next.add(section);
        return next;
    });
  };

  const stats = {
    totalGood: categorizedData.iphone.length + categorizedData.android.length + categorizedData.other.length,
    iphone: categorizedData.iphone.length,
    android: categorizedData.android.length,
    restricted: categorizedData.restricted.length,
    other: categorizedData.other.length
  };

  // --- ACTIONS ---

  const handleOpenModal = (account?: VaultAccount) => {
    if (account) {
      setEditingId(account.id);
      const { id, updatedAt, ...rest } = account;
      setFormData({
        ...rest,
        handle: rest.handle || rest.platform || '',
        device: rest.device || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        username: '',
        handle: '',
        password: '',
        emailPassword: '',
        secretKey: '',
        notes: '',
        device: '',
        status: 'GOOD ACC.',
        customOrder: accounts.length + 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveVaultAccount(formData, editingId || undefined);
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save account");
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (window.confirm(`Delete credentials for ${username}?`)) {
      await deleteVaultAccount(id, username);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisibility = (id: string, field: string) => {
    const key = `${id}-${field}`;
    setVisibleFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const styles = `
      <style>
        body { font-family: 'Segoe UI', sans-serif; font-size: 11pt; }
        th { background-color: #374151; color: white; border: 1px solid #4b5563; padding: 10px; text-align:left; }
        td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
        .device-col { background-color: #f3f4f6; font-weight: bold; }
        .cred-col { font-family: monospace; }
      </style>
    `;
    const renderTableRows = (list: VaultAccount[]) => list.map(acc => `
       <tr>
         <td>${acc.handle || '-'}</td>
         <td>${acc.username}</td>
         <td class="cred-col">${acc.password || ''}</td>
         <td class="cred-col">${acc.emailPassword || ''}</td>
         <td class="cred-col">${acc.secretKey || ''}</td>
         <td class="device-col">${acc.device || 'Unassigned'}</td>
       </tr>
    `).join('');
    
    const htmlContent = `
      <html>
      <head>${styles}</head>
      <body>
        <h2>Account Vault Report - ${dateStr}</h2>
        <table>
          <thead>
            <tr>
              <th>Username / Handle</th>
              <th>Email Address</th>
              <th>Account Password</th>
              <th>Email Password</th>
              <th>2FA Secret</th>
              <th>Assigned Device</th>
            </tr>
          </thead>
          <tbody>${renderTableRows(accounts)}</tbody>
        </table>
      </body>
      </html>`;
      
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Vault_Report_${dateStr}.xls`;
    link.click();
  };

  const RenderPasswordField = ({ text, id, field }: { text: string | undefined, id: string, field: string }) => {
    if (!text) return <span className="text-gray-600 italic text-[10px]">Empty</span>;
    const isVisible = visibleFields.has(`${id}-${field}`);
    return (
      <div className="flex items-center justify-between bg-gray-900/50 px-2 py-1.5 rounded border border-gray-700/50 group/field w-full">
        <div className="flex-1 truncate font-mono text-[10px] text-gray-300 mr-2">
          {isVisible ? text : '••••••••'}
        </div>
        <div className="flex gap-1 shrink-0">
            <button onClick={() => toggleVisibility(id, field)} className="text-gray-500 hover:text-white transition-colors">
            {isVisible ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
            </button>
            <button onClick={() => copyToClipboard(text, `${id}-${field}`)} className="text-gray-500 hover:text-blue-400 transition-colors">
            {copiedId === `${id}-${field}` ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
            </button>
        </div>
      </div>
    );
  };

  const AccountCard = ({ account, type }: { account: VaultAccount, type: 'iphone' | 'android' | 'restricted' | 'other' }) => {
      const displayHandle = account.handle || account.platform || 'No Handle';
      let borderClass = 'border-gray-700 hover:border-gray-500';
      let icon = <Smartphone className="w-5 h-5 text-gray-400" />;
      let bgClass = 'bg-gray-800';

      if (type === 'restricted') {
          borderClass = 'border-red-500/50 hover:border-red-500';
          icon = <AlertTriangle className="w-5 h-5 text-red-500" />;
          bgClass = 'bg-gradient-to-br from-gray-800 to-red-900/10';
      } else if (type === 'iphone') {
          borderClass = 'border-blue-500/30 hover:border-blue-400';
          icon = <Apple className="w-5 h-5 text-blue-400" />;
          bgClass = 'bg-gradient-to-br from-gray-800 to-blue-900/10';
      } else if (type === 'android') {
          borderClass = 'border-green-500/30 hover:border-green-400';
          icon = <MonitorSmartphone className="w-5 h-5 text-green-400" />;
          bgClass = 'bg-gradient-to-br from-gray-800 to-green-900/10';
      }

      return (
        <div className={`${bgClass} rounded-xl border ${borderClass} p-4 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative group`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-900 rounded-lg shadow-inner border border-gray-700">{icon}</div>
                    <div>
                        <h3 className="font-bold text-white text-sm truncate max-w-[120px]" title={displayHandle}>{displayHandle}</h3>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 truncate max-w-[120px]" title={account.username}>
                            <Mail className="w-3 h-3" /> {account.username}
                        </div>
                    </div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded border ${
                    account.status === 'GOOD ACC.' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'
                }`}>
                    {account.status}
                </div>
            </div>
            <div className="mb-4 relative z-10">
                <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Assigned Device</p>
                    <p className="text-[10px] text-blue-400 font-medium truncate max-w-[100px]">{account.device || 'Unassigned'}</p>
                </div>
                <div className="text-xs text-gray-300 bg-gray-900/50 p-2 rounded border border-gray-700/50 h-10 overflow-y-auto custom-scrollbar">
                    {account.notes || <span className="italic opacity-50">No notes.</span>}
                </div>
            </div>
            <div className="space-y-2 mb-4 relative z-10">
                <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Password</label><RenderPasswordField text={account.password} id={account.id} field="password" /></div>
                    <div><label className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Email Pwd</label><RenderPasswordField text={account.emailPassword} id={account.id} field="emailPwd" /></div>
                </div>
                <div><label className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">2FA Secret</label><RenderPasswordField text={account.secretKey} id={account.id} field="2fa" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-700 relative z-10">
                <button onClick={() => handleOpenModal(account)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(account.id, account.username)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
        </div>
      );
  };

  const PhoneDevice = ({ name, accounts }: { name: string, accounts: VaultAccount[] }) => {
      const [isLocked, setIsLocked] = useState(true);
      const [currentTime, setCurrentTime] = useState(new Date());
      const type = getDeviceType(name);
      
      useEffect(() => {
          const timer = setInterval(() => setCurrentTime(new Date()), 1000);
          return () => clearInterval(timer);
      }, []);

      const isIphone = type === 'iphone';
      const isUnassigned = name === 'Unassigned Accounts';
      
      const chassisClass = isIphone 
        ? "rounded-[3.5rem] border-[14px] border-gray-900 bg-black shadow-[0_0_0_2px_#4b5563,0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_0_0_2px_rgba(255,255,255,0.1)] ring-1 ring-white/10" 
        : "rounded-[2rem] border-[8px] border-gray-800 bg-gray-900 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5";
      const unassignedClass = "rounded-[2rem] border-[4px] border-dashed border-gray-600 bg-gray-900/50 shadow-none opacity-80 scale-95";
      const screenClass = isIphone ? "rounded-[2.6rem] bg-black" : "rounded-[1.5rem] bg-black";
      const wallpaperClass = isIphone
        ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black"
        : (isUnassigned ? "bg-gradient-to-br from-gray-800 to-gray-900" : "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-900 via-gray-900 to-black");

      return (
        <div className={`relative w-full max-w-[340px] mx-auto h-[700px] ${isUnassigned ? unassignedClass : chassisClass} transform transition-all duration-200 flex flex-col group`}>
            {isIphone && !isUnassigned && (
                <>
                    <div className="absolute top-20 -left-[17px] w-[3px] h-6 bg-gray-600 rounded-l-md shadow-lg"></div>
                    <div className="absolute top-32 -left-[17px] w-[3px] h-10 bg-gray-600 rounded-l-md shadow-lg"></div>
                    <div className="absolute top-44 -left-[17px] w-[3px] h-10 bg-gray-600 rounded-l-md shadow-lg"></div>
                    <div className="absolute top-36 -right-[17px] w-[3px] h-14 bg-gray-600 rounded-r-md shadow-lg"></div>
                </>
            )}
            {!isIphone && !isUnassigned && (
                <>
                    <div className="absolute top-32 -right-[11px] w-[3px] h-16 bg-gray-500 rounded-r-sm"></div>
                    <div className="absolute top-52 -right-[11px] w-[3px] h-10 bg-gray-500 rounded-r-sm"></div>
                </>
            )}
            <div className={`w-full h-full overflow-hidden relative border-[1px] border-gray-800/50 ${screenClass} flex flex-col`}>
                <div className="absolute top-0 w-full h-12 z-40 flex justify-between items-start px-6 pt-3 pointer-events-none">
                    <span className="text-[12px] font-semibold text-white tracking-wide pl-1">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="pr-1 flex gap-1.5 items-center"><Signal className="w-3 h-3 text-white" /><Wifi className="w-3 h-3 text-white" /><Battery className="w-4 h-4 text-white" /></div>
                </div>
                {isIphone ? (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-full z-30 flex justify-end items-center pr-2 pointer-events-none transition-all duration-300 group-hover:w-[110px]">
                       <div className="w-2 h-2 rounded-full bg-gray-800/50 mr-1"></div><div className="w-3 h-3 rounded-full bg-gray-800/80"></div>
                    </div>
                ) : (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-30 border border-gray-800/50 pointer-events-none flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gray-900 rounded-full opacity-60"></div></div>
                )}
                {isLocked ? (
                    <div className={`w-full h-full ${wallpaperClass} flex flex-col relative z-20 cursor-pointer`} onClick={() => setIsLocked(false)}>
                        <div className="flex-1 flex flex-col items-center justify-start pt-24 animate-in fade-in zoom-in duration-700">
                            <Lock className="w-5 h-5 text-white/70 mb-4" />
                            <div className="text-6xl font-thin text-white tracking-tighter mb-2 font-[system-ui]">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                            <div className="text-lg text-white/90 font-medium tracking-wide">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div className="px-4 pb-24 space-y-2">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-900 p-1 rounded-md border border-white/10">{isIphone ? <Apple className="w-3 h-3 text-white" /> : <MonitorSmartphone className="w-3 h-3 text-white" />}</div>
                                        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide">Vault Security</span>
                                    </div>
                                    <span className="text-[10px] text-white/60">now</span>
                                </div>
                                <div className="text-white font-semibold text-sm">{name}</div>
                                <div className="text-white/70 text-xs mt-0.5">{accounts.length} accounts secured. Tap to unlock.</div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 w-full flex justify-between px-12 items-center text-white/80">
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Fingerprint className="w-5 h-5" /></div>
                            <div className="flex flex-col items-center gap-1 animate-pulse"><span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Swipe up</span><div className="w-10 h-1 bg-white rounded-full opacity-80"></div></div>
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><div className="w-4 h-4 border-2 border-white rounded-sm opacity-80"></div></div>
                        </div>
                    </div>
                ) : (
                    <div className={`h-full w-full ${wallpaperClass} flex flex-col relative z-10`}>
                        <div className="pt-14 pb-4 px-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${isIphone ? "bg-white/10 text-white border border-white/20" : "bg-green-500/10 text-green-300 border border-green-500/20"}`}>
                                {isIphone ? <Apple className="w-3 h-3"/> : <MonitorSmartphone className="w-3 h-3"/>}
                                <span className="truncate max-w-[120px]">{name}</span>
                            </div>
                            <button onClick={() => setIsLocked(true)} className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/80 transition-colors backdrop-blur-sm"><Lock className="w-3 h-3" /></button>
                        </div>
                        {/* Improved "Facebook/App" View readability */}
                        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 custom-scrollbar relative">
                            {accounts.map(acc => (
                                <div key={acc.id} className="bg-gray-900/95 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-lg relative group/card hover:bg-gray-900 transition-colors">
                                    <div className="flex justify-between items-start mb-3 border-b border-gray-700/50 pb-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-inner ${acc.status === 'GOOD ACC.' ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-red-600 to-orange-600'}`}>
                                                {acc.handle ? acc.handle[0].toUpperCase() : <User className="w-5 h-5"/>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white text-xs truncate leading-tight mb-0.5">{acc.handle || acc.platform || 'No Handle'}</div>
                                                <div className="text-[9px] text-gray-400 truncate flex items-center gap-1">
                                                    <Mail className="w-2.5 h-2.5" /> {acc.username}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleOpenModal(acc)} className="text-gray-500 hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="bg-black/60 rounded-lg px-2.5 py-2 flex justify-between items-center border border-white/5">
                                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Pass</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] text-white font-mono tracking-widest">{acc.password || '••••••'}</span>
                                                <button onClick={() => copyToClipboard(acc.password || '', acc.id+'pwd')} className="text-gray-500 hover:text-blue-400 transition-colors">
                                                    {copiedId === acc.id+'pwd' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                                                </button>
                                            </div>
                                        </div>
                                        {acc.secretKey && (
                                            <div className="bg-black/60 rounded-lg px-2.5 py-2 flex justify-between items-center border border-white/5">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">2FA</span>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[10px] text-white font-mono tracking-widest truncate max-w-[80px]">••••••</span>
                                                    <button onClick={() => copyToClipboard(acc.secretKey || '', acc.id+'2fa')} className="text-gray-500 hover:text-blue-400 transition-colors">
                                                        {copiedId === acc.id+'2fa' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="h-12 w-full flex items-center justify-center z-20 pointer-events-none">
                            {isIphone ? <div className="w-[35%] h-1 bg-white rounded-full shadow-sm opacity-80"></div> : 
                            <div className="flex items-center gap-12 text-white/50"><ChevronLeft className="w-5 h-5" /><div className="w-3 h-3 rounded-full border-2 border-white/50"></div><div className="w-3 h-3 rounded-sm border-2 border-white/50"></div></div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col xl:flex-row justify-between items-start gap-6">
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Lock className="w-6 h-6 text-purple-400" /> Account Vault</h2>
                <p className="text-gray-400 text-sm mt-1 mb-4">Secure credentials and device assignment management.</p>
                <div className="flex flex-wrap gap-4">
                    <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400" /><div><p className="text-xs text-gray-500 uppercase font-bold">Active</p><p className="text-lg font-bold text-white">{stats.totalGood}</p></div></div>
                    <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg flex items-center gap-3"><Apple className="w-5 h-5 text-blue-400" /><div><p className="text-xs text-gray-500 uppercase font-bold">iOS</p><p className="text-lg font-bold text-white">{stats.iphone}</p></div></div>
                    <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg flex items-center gap-3"><MonitorSmartphone className="w-5 h-5 text-green-400" /><div><p className="text-xs text-gray-500 uppercase font-bold">Android</p><p className="text-lg font-bold text-white">{stats.android}</p></div></div>
                    <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg flex items-center gap-3"><AlertCircle className="w-5 h-5 text-gray-400" /><div><p className="text-xs text-gray-500 uppercase font-bold">Unassigned</p><p className="text-lg font-bold text-white">{stats.other}</p></div></div>
                    {stats.restricted > 0 && <div className="bg-red-900/20 border border-red-500/30 px-4 py-2 rounded-lg flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-red-400" /><div><p className="text-xs text-red-300 uppercase font-bold">Issues</p><p className="text-lg font-bold text-white">{stats.restricted}</p></div></div>}
                </div>
            </div>
            <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700 w-full xl:w-auto">
                    <button onClick={() => setActiveTab('list')} className={`flex-1 xl:flex-none px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'list' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}><Grid className="w-4 h-4" /> Categorized List</button>
                    <button onClick={() => setActiveTab('devices')} className={`flex-1 xl:flex-none px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'devices' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /> Device Sort</button>
                </div>
                <div className="flex gap-2 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" placeholder="Search..." className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}`}><Filter className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-2 w-full xl:w-auto">
                    <button onClick={handleExportExcel} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all"><FileSpreadsheet className="w-4 h-4" /> Export</button>
                    <button onClick={() => handleOpenModal()} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all"><Plus className="w-4 h-4" /> Add Account</button>
                </div>
            </div>
        </div>

        {showFilters && (
            <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-wrap gap-4 items-center animate-in slide-in-from-top-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Advanced Filters:</span>
                <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Email Starts With:</span><input type="text" maxLength={1} className="w-10 bg-gray-900 border border-gray-700 text-white text-center rounded p-1 focus:ring-1 focus:ring-purple-500 outline-none uppercase" value={emailStartChar} onChange={(e) => setEmailStartChar(e.target.value)}/></div>
                <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Username Ends With:</span><input type="text" className="w-16 bg-gray-900 border border-gray-700 text-white text-center rounded p-1 focus:ring-1 focus:ring-purple-500 outline-none" placeholder="e.g. 88" value={emailEndChar} onChange={(e) => setEmailEndChar(e.target.value)}/></div>
                <button onClick={() => { setEmailStartChar(''); setEmailEndChar(''); }} className="text-xs text-red-400 hover:text-red-300 ml-auto">Clear Filters</button>
            </div>
        )}

        {activeTab === 'list' && (
            <div className="space-y-8">
                {categorizedData.restricted.length > 0 && (
                    <div>
                        <button onClick={() => toggleSection('restricted')} className="w-full flex items-center justify-between mb-4 group text-left">
                            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 bg-red-900/10 p-3 rounded-lg border border-red-500/20 w-fit group-hover:bg-red-900/20 transition-colors">
                                {collapsedSections.has('restricted') ? <ChevronRight className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                                <AlertTriangle className="w-5 h-5" /> Restricted / Issues ({categorizedData.restricted.length})
                            </h3>
                            <div className="h-px bg-red-900/30 flex-1 ml-4 group-hover:bg-red-900/50 transition-colors"></div>
                        </button>
                        {!collapsedSections.has('restricted') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                {categorizedData.restricted.map(acc => <AccountCard key={acc.id} account={acc} type="restricted" />)}
                            </div>
                        )}
                    </div>
                )}
                {categorizedData.other.length > 0 && (
                    <div>
                        <button onClick={() => toggleSection('other')} className="w-full flex items-center gap-4 mb-4 group text-left">
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-300">
                                {collapsedSections.has('other') ? <ChevronRight className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                                <Laptop className="w-5 h-5" /> Other / Unassigned ({categorizedData.other.length})
                            </div>
                            <div className="h-px bg-gray-800 flex-1 group-hover:bg-gray-700 transition-colors"></div>
                        </button>
                        {!collapsedSections.has('other') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                {categorizedData.other.map(acc => <AccountCard key={acc.id} account={acc} type="other" />)}
                            </div>
                        )}
                    </div>
                )}
                {categorizedData.iphone.length > 0 && (
                    <div>
                        <button onClick={() => toggleSection('iphone')} className="w-full flex items-center gap-4 mb-4 group text-left">
                            <div className="flex items-center gap-2 text-lg font-bold text-white">
                                {collapsedSections.has('iphone') ? <ChevronRight className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                                <Apple className="w-5 h-5 text-gray-300" /> iPhone Devices ({categorizedData.iphone.length})
                            </div>
                            <div className="h-px bg-gray-800 flex-1 group-hover:bg-gray-700 transition-colors"></div>
                        </button>
                        {!collapsedSections.has('iphone') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                {categorizedData.iphone.map(acc => <AccountCard key={acc.id} account={acc} type="iphone" />)}
                            </div>
                        )}
                    </div>
                )}
                {categorizedData.android.length > 0 && (
                    <div>
                        <button onClick={() => toggleSection('android')} className="w-full flex items-center gap-4 mb-4 group text-left">
                            <div className="flex items-center gap-2 text-lg font-bold text-white">
                                {collapsedSections.has('android') ? <ChevronRight className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                                <MonitorSmartphone className="w-5 h-5 text-gray-300" /> Android Devices ({categorizedData.android.length})
                            </div>
                            <div className="h-px bg-gray-800 flex-1 group-hover:bg-gray-700 transition-colors"></div>
                        </button>
                        {!collapsedSections.has('android') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                                {categorizedData.android.map(acc => <AccountCard key={acc.id} account={acc} type="android" />)}
                            </div>
                        )}
                    </div>
                )}
                {filteredAccounts.length === 0 && (
                    <div className="p-12 text-center text-gray-500 border border-dashed border-gray-700 rounded-xl bg-gray-800/30"><Search className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No accounts found matching your filters.</p></div>
                )}
            </div>
        )}

        {/* Updated Device Grid to support 3 columns (xl:grid-cols-3) */}
        {activeTab === 'devices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {masterDeviceOrder.map((groupKey, index) => {
                    // Only render if it contains visible accounts (matches filter)
                    if (!visibleDeviceKeys.has(groupKey)) return null;

                    const displayName = allDeviceGroups.get(groupKey)?.displayName || groupKey;
                    
                    // Filter accounts for this group based on current filters
                    const groupAccounts = filteredAccounts.filter(acc => {
                        const d = acc.device ? acc.device.trim() : '';
                        const k = d ? d.toLowerCase().replace(/\s+/g, ' ') : 'unassigned';
                        return k === groupKey;
                    });

                    return (
                        <div 
                            key={groupKey}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`bg-gray-800 border rounded-xl overflow-hidden transition-all ${
                                draggedIndex === index ? 'opacity-50 border-purple-500 border-dashed' : 'border-gray-700 hover:border-gray-600'
                            }`}
                        >
                            <div className="bg-gray-900/50 p-4 flex items-center justify-between border-b border-gray-700 cursor-move">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg"><GripHorizontal className="w-4 h-4 text-gray-500" /></div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-lg">{displayName}</h3>
                                        <span className="bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-400">{groupAccounts.length}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 flex justify-center bg-gray-800/50">
                                <PhoneDevice name={displayName} accounts={groupAccounts} />
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">{editingId ? <Edit2 className="w-5 h-5 text-purple-400"/> : <Plus className="w-5 h-5 text-green-400"/>} {editingId ? 'Edit Credentials' : 'New Account Entry'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                                <select className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                    <option value="GOOD ACC.">GOOD ACC.</option><option value="RESTRICTED">RESTRICTED</option><option value="BANNED">BANNED</option><option value="NEEDS VERIFY">NEEDS VERIFY</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Device Assignment</label>
                                <div className="relative">
                                    <input type="text" list="devices-list" placeholder="e.g. iPhone 15 Pro Max" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={formData.device} onChange={(e) => setFormData({...formData, device: e.target.value})}/>
                                    <datalist id="devices-list">{existingDevices.map((d, i) => <option key={i} value={d} />)}</datalist>
                                </div>
                            </div>
                        </div>
                        
                        {/* Split Email and Handle Inputs Explicitly */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Email Address (Login)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input required type="text" placeholder="example@email.com" className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Username / Handle</label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="text" placeholder="username123" className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={formData.handle} onChange={(e) => setFormData({...formData, handle: e.target.value})}/>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Account Password</label>
                                <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Email Password</label>
                                <input type="text" className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono" value={formData.emailPassword} onChange={(e) => setFormData({...formData, emailPassword: e.target.value})}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">2FA Secret Key (TOTP)</label>
                            <input type="text" placeholder="Paste secret key here..." className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-xs" value={formData.secretKey} onChange={(e) => setFormData({...formData, secretKey: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Notes / Sim Info</label>
                            <textarea rows={3} className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}/>
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium">Cancel</button>
                            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all">Save Entry</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AccountVault;
