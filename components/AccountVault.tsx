
import React, { useState, useEffect } from 'react';
import { 
  LockKeyhole, Plus, Search, Edit2, Trash2, Copy, Eye, EyeOff, 
  ShieldCheck, Key, RefreshCw, X, Check, Smartphone, FileText, AlertTriangle, Mail, FileSpreadsheet, AtSign
} from 'lucide-react';
import * as OTPAuth from 'otpauth';
import { VaultAccount } from '../types';
import { subscribeToVault, saveVaultAccount, deleteVaultAccount } from '../services/storageService';
import { auth } from '../services/firebase';

const AccountVault: React.FC = () => {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Tick for updating OTPs every second
  const [tick, setTick] = useState(Date.now());

  // Local UI State - using composite keys for multiple passwords per card
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VaultAccount>>({
    platform: '',
    username: '',
    password: '',
    emailPassword: '',
    secretKey: '',
    notes: ''
  });

  // 1. Subscribe to Data
  useEffect(() => {
    const unsubscribe = subscribeToVault(
      (data) => {
        setAccounts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Vault sync failed", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Global Timer for TOTP
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- ACTIONS ---

  const handleOpenModal = (account?: VaultAccount) => {
    if (account) {
      setEditingId(account.id);
      setFormData({
        platform: account.platform,
        username: account.username,
        password: account.password,
        emailPassword: account.emailPassword || '',
        secretKey: account.secretKey || '',
        notes: account.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        platform: '',
        username: '',
        password: '',
        emailPassword: '',
        secretKey: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic cleanup of secret key (remove spaces)
      const cleanSecret = formData.secretKey ? formData.secretKey.replace(/\s/g, '').toUpperCase() : '';
      
      await saveVaultAccount({
        platform: formData.platform || '',
        username: formData.username || '',
        password: formData.password || '',
        emailPassword: formData.emailPassword || '',
        secretKey: cleanSecret,
        notes: formData.notes || ''
      } as VaultAccount, editingId || undefined);
      
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save account.");
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (window.confirm(`Delete credentials for ${username}? This cannot be undone.`)) {
      await deleteVaultAccount(id, username);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisibility = (key: string) => {
    setShowPasswordMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- EXPORT FUNCTION ---
  const handleExportVault = () => {
    const filteredAccounts = accounts.filter(acc => 
        acc.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        acc.platform.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredAccounts.length === 0) {
        alert("No accounts to export.");
        return;
    }

    const currentUser = auth.currentUser?.email || "System User";
    const dateStr = new Date().toLocaleString();
    const exportDate = new Date().toISOString().split('T')[0];

    // Professional HTML/CSS for Excel
    // Updated: Dark text on White background for visibility in Excel light mode
    const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Tiktok Vault</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #ffffff; }
                .header-container { 
                    background-color: #ffffff;
                    color: #000000;
                    padding: 30px; 
                    text-align: center; 
                    border-bottom: 5px solid #10b981; /* Emerald-500 */
                }
                .title { 
                    font-size: 28px; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    margin-bottom: 10px; 
                    letter-spacing: 1.5px;
                    color: #000000;
                }
                .meta { 
                    font-size: 12px; 
                    color: #4b5563; /* Gray-600 */
                    margin-bottom: 5px; 
                    font-family: Consolas, monospace;
                }
                .source-link { 
                    color: #059669; /* Emerald-600 */
                    text-decoration: none; 
                    font-weight: bold; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 30px; 
                    font-size: 13px;
                    border: 1px solid #e2e8f0;
                }
                th { 
                    background-color: #064e3b; /* Emerald-900 */
                    color: #ffffff; 
                    padding: 15px; 
                    text-align: left; 
                    border: 1px solid #065f46; 
                    text-transform: uppercase; 
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
                td { 
                    padding: 12px 15px; 
                    border: 1px solid #cbd5e1; 
                    vertical-align: top; 
                    color: #334155; 
                }
                tr:nth-child(even) { 
                    background-color: #f0fdf4; /* Emerald-50 */
                }
                tr:hover {
                    background-color: #d1fae5; /* Emerald-100 */
                }
                .username-cell {
                    font-weight: bold;
                    color: #0f172a;
                }
                .secret { 
                    font-family: 'Consolas', monospace; 
                    color: #059669; 
                    font-weight: bold; 
                    background-color: #ecfdf5;
                    padding: 2px 5px;
                    border-radius: 4px;
                }
                .pass { 
                    font-family: 'Consolas', monospace;
                    color: #475569;
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="title">Tiktok accounts vault</div>
                <div class="meta">Source: <a href="https://nano-stream.vercel.app/" class="source-link">https://nano-stream.vercel.app/</a></div>
                <div class="meta">Generated By: ${currentUser}</div>
                <div class="meta">Generated On: ${dateStr}</div>
            </div>
            <br/>
            <table>
                <thead>
                    <tr>
                        <th width="200">Username</th>
                        <th width="250">Email</th>
                        <th width="150">Password (Main)</th>
                        <th width="150">Password (Email)</th>
                        <th width="200">2FA Secret</th>
                        <th width="250">Notes</th>
                        <th width="120">Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredAccounts.map(acc => `
                        <tr>
                            <td class="username-cell">${acc.platform}</td>
                            <td>${acc.username}</td>
                            <td class="pass">${acc.password || '-'}</td>
                            <td class="pass">${acc.emailPassword || '-'}</td>
                            <td class="secret">${acc.secretKey || '-'}</td>
                            <td>${acc.notes || ''}</td>
                            <td>${new Date(acc.updatedAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Tiktok_Vault_Export_${exportDate}.xls`;
    link.click();
  };

  // --- TOTP HELPER ---
  const getTotpData = (secret: string) => {
    try {
      if (!secret) return null;
      
      // otpauth library usage
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });
      
      const token = totp.generate();
      
      // Calculate remaining seconds in the current 30s window
      const epoch = Math.floor(Date.now() / 1000);
      const period = 30;
      const remaining = period - (epoch % period);
      const progress = (remaining / period) * 100;

      return { token, remaining, progress };
    } catch (e) {
      return null; // Invalid secret
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.platform.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-gradient-to-br from-gray-700 to-gray-600 p-2 rounded-lg shadow-inner">
               <LockKeyhole className="w-6 h-6 text-emerald-400" />
            </div>
            Account Vault
          </h2>
          <p className="text-gray-400 mt-2 text-sm">
            Securely manage credentials and generate 2FA codes for TikTok accounts.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
             onClick={handleExportVault}
             className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all whitespace-nowrap"
             title="Export to Excel"
           >
              <FileSpreadsheet className="w-4 h-4" /> Export
           </button>

           <button 
             onClick={() => handleOpenModal()}
             className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all whitespace-nowrap"
           >
              <Plus className="w-4 h-4" /> Add Account
           </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map(account => {
          const totpData = account.secretKey ? getTotpData(account.secretKey) : null;
          
          // Visibility Keys
          const platformKey = `${account.id}-platform`;
          const emailKey = `${account.id}-email`;
          
          const isPlatformVisible = showPasswordMap[platformKey];
          const isEmailVisible = showPasswordMap[emailKey];

          return (
            <div key={account.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl hover:border-emerald-500/30 transition-all group relative overflow-hidden">
               {/* Username Badge (Previously Platform) */}
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                     <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 shadow-inner">
                        {/* Always show T icon for consistency in Tiktok Vault, or fall back if empty */}
                        <div className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center font-bold text-[10px] leading-none">
                             T
                        </div>
                     </div>
                     <div>
                        <h3 className="font-bold text-white text-lg">{account.platform || 'Unknown'}</h3>
                        <p className="text-xs text-gray-500">Updated: {new Date(account.updatedAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleOpenModal(account)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit2 className="w-4 h-4"/></button>
                     <button onClick={() => handleDelete(account.id, account.username)} className="p-2 hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
               </div>

               {/* Credentials */}
               <div className="space-y-3">
                  
                  {/* Email (Was Username/Email) */}
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 flex justify-between items-center group/field">
                     <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Email</label>
                        <div className="text-sm font-mono text-gray-200">{account.username}</div>
                     </div>
                     <button 
                        onClick={() => copyToClipboard(account.username, `${account.id}-user`)}
                        className="p-1.5 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
                     >
                        {copiedId === `${account.id}-user` ? <Check className="w-4 h-4 text-emerald-400"/> : <Copy className="w-4 h-4"/>}
                     </button>
                  </div>

                  {/* Platform Password (TikTok) */}
                  {account.password && (
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 flex justify-between items-center group/field">
                        <div className="flex-1 overflow-hidden">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">TikTok Password</label>
                            <div className="text-sm font-mono text-gray-200 truncate">
                                {isPlatformVisible ? account.password : '••••••••••••'}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => toggleVisibility(platformKey)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
                            >
                                {isPlatformVisible ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                            <button 
                                onClick={() => copyToClipboard(account.password!, `${account.id}-pass`)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
                            >
                                {copiedId === `${account.id}-pass` ? <Check className="w-4 h-4 text-emerald-400"/> : <Copy className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                  )}

                  {/* Email Password (Outlook/etc) */}
                  {account.emailPassword && (
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 flex justify-between items-center group/field">
                        <div className="flex-1 overflow-hidden">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email Password
                            </label>
                            <div className="text-sm font-mono text-gray-200 truncate">
                                {isEmailVisible ? account.emailPassword : '••••••••••••'}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => toggleVisibility(emailKey)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
                            >
                                {isEmailVisible ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                            <button 
                                onClick={() => copyToClipboard(account.emailPassword!, `${account.id}-emailpass`)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
                            >
                                {copiedId === `${account.id}-emailpass` ? <Check className="w-4 h-4 text-emerald-400"/> : <Copy className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                  )}

                  {/* 2FA / TOTP Section */}
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

                            {/* Progress Bar Background */}
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

                  {/* Notes */}
                  {account.notes && (
                      <div className="pt-2">
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                              <span className="font-bold text-gray-400">Note:</span> {account.notes}
                          </p>
                      </div>
                  )}
               </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAccounts.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-gray-800/50 border border-dashed border-gray-700 rounded-2xl text-gray-500">
              <LockKeyhole className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-400">No accounts found</p>
              <p className="text-sm">Secure your first account credentials now.</p>
              <button onClick={() => handleOpenModal()} className="mt-4 text-emerald-400 hover:underline text-sm">Add Account</button>
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
           <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 sticky top-0 z-10">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {editingId ? <Edit2 className="w-4 h-4 text-purple-400"/> : <Plus className="w-4 h-4 text-emerald-400"/>}
                    {editingId ? 'Edit Credentials' : 'Add New Account'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <AtSign className="w-3 h-3" /> Username
                    </label>
                    <input 
                       type="text" 
                       className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                       placeholder="e.g. @tiktok_user"
                       value={formData.platform} // Mapped to platform storage
                       onChange={e => setFormData({...formData, platform: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                    </label>
                    <input 
                       required
                       type="text" 
                       className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                       placeholder="email@example.com"
                       value={formData.username} // Mapped to username storage
                       onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">TikTok Password</label>
                    <input 
                       type="text" 
                       className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                       placeholder="••••••••"
                       value={formData.password}
                       onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email Password (Outlook)
                    </label>
                    <input 
                       type="text" 
                       className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                       placeholder="••••••••"
                       value={formData.emailPassword}
                       onChange={e => setFormData({...formData, emailPassword: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                        <Key className="w-3 h-3" /> 2FA Secret Key (Optional)
                    </label>
                    <input 
                       type="text" 
                       className="w-full bg-emerald-900/10 border border-emerald-500/30 text-emerald-100 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs placeholder-emerald-700/50"
                       placeholder="JBSWY3DPEHPK3PXP"
                       value={formData.secretKey}
                       onChange={e => setFormData({...formData, secretKey: e.target.value})}
                    />
                    <p className="text-[10px] text-gray-500">
                        Paste the Base32 Setup Key provided by TikTok/Google during 2FA setup.
                    </p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Notes</label>
                    <textarea 
                       rows={2}
                       className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                       placeholder="Additional details..."
                       value={formData.notes}
                       onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                 </div>

                 <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg text-sm">Save Account</button>
                 </div>

              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AccountVault;
