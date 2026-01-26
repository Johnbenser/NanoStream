
import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, Sparkles, Menu, X, Shield, LogOut, Lock, Link, Globe, ShoppingBag, ShieldAlert, Briefcase, ChevronDown, Bell, CalendarDays, Flame, LockKeyhole } from 'lucide-react';
import { ViewState } from '../types';
import { logout } from '../services/authService';
import { addLog } from '../services/storageService';

interface LayoutProps {
  children: ReactNode;
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  userRole: 'ADMIN' | 'EDITOR' | 'CSR';
  userEmail: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, onLogout, userRole, userEmail }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Extract username from synthetic email (user@nanostream.internal -> user)
  const displayUsername = userEmail ? userEmail.split('@')[0] : 'User';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await addLog('LOGOUT', 'System Exit');
    await logout();
    onLogout();
  };

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.VIRAL_REPORT, label: 'Viral Video Report', icon: Flame }, 
    { id: ViewState.CLIENTS, label: 'Client Workspaces', icon: Briefcase }, 
    { id: ViewState.BRANDS, label: 'Product Inventory', icon: ShoppingBag }, 
    { id: ViewState.REPORTS, label: 'Violations & Reports', icon: ShieldAlert },
    { id: ViewState.VAULT, label: 'Account Vault', icon: LockKeyhole },
    { id: ViewState.TOOLS, label: 'AI Tools', icon: Sparkles },
    { id: ViewState.PLANNER, label: 'Content Planner', icon: CalendarDays },
    { id: ViewState.LINKS, label: 'Internal Links', icon: Link },
    // Only Admin can see logs and user management
    ...(userRole === 'ADMIN' ? [
      { id: ViewState.LOGS, label: 'Activity Logs', icon: Shield },
      { id: ViewState.USERS, label: 'Team', icon: Lock },
    ] : []),
  ];

  const getRoleLabel = () => {
    if (userRole === 'ADMIN') return 'Administrator';
    if (userRole === 'CSR') return 'Customer Support';
    return 'Editor';
  };

  const getAvatarGradient = () => {
    if (userRole === 'ADMIN') return 'bg-gradient-to-tr from-purple-500 to-pink-500';
    if (userRole === 'CSR') return 'bg-gradient-to-tr from-orange-400 to-yellow-500';
    return 'bg-gradient-to-tr from-blue-500 to-cyan-500';
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 flex items-center gap-3 border-b border-gray-800">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Global Media</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Live System</p>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="ml-auto lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeView === item.id 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                `}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-blue-400' : 'text-gray-500'}`} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Footer User Info (Mobile/Compact) */}
          <div className="p-4 border-t border-gray-800 lg:hidden">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${getAvatarGradient()}`}>
                  {displayUsername.substring(0, 2).toUpperCase()}
                </div>
                <div>
                   <p className="text-sm font-bold text-white">{displayUsername}</p>
                   <p className="text-xs text-gray-500">{getRoleLabel()}</p>
                </div>
             </div>
             <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm">
                <LogOut className="w-4 h-4"/> Logout
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-gray-900 border-b border-gray-800 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Breadcrumb or Page Title could go here */}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors cursor-pointer relative">
               <Bell className="w-4 h-4" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-900"></span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-800 transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white leading-none">{displayUsername}</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-1">{getRoleLabel()}</p>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${getAvatarGradient()}`}>
                  {displayUsername.substring(0, 2).toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                  <div className="px-4 py-3 border-b border-gray-700 sm:hidden">
                    <p className="text-sm text-white font-bold">{displayUsername}</p>
                    <p className="text-xs text-gray-500">{userEmail}</p>
                  </div>
                  <div className="px-4 py-2 border-b border-gray-700">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</p>
                     <p className="text-sm text-blue-400 font-medium">{getRoleLabel()}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
