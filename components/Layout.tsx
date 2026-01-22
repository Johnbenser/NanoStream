import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, Sparkles, Menu, X, Shield, LogOut, Lock, Link, Globe, ShoppingBag, ShieldAlert, Briefcase, ChevronDown, Bell, CalendarDays, Flame } from 'lucide-react';
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
    { id: ViewState.VIRAL_REPORT, label: 'Viral Video Report', icon: Flame }, // NEW
    { id: ViewState.CLIENTS, label: 'Client Workspaces', icon: Briefcase }, // New Client Section
    { id: ViewState.BRANDS, label: 'Product Inventory', icon: ShoppingBag }, 
    { id: ViewState.REPORTS, label: 'Violations & Reports', icon: ShieldAlert },
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
    <div className="min-h-screen flex bg-gray-900 text-gray-100 font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-700 flex flex-col items-center text-center">
            <div className="bg-white rounded-lg p-2 mb-3 h-10 w-10 flex items-center justify-center">
               <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Global Media Live
            </h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">FOR A.I CONTENT CAMPAIGN MONITORING</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeView === item.id
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <item.icon className={`w-5 h-5 ${item.id === ViewState.VIRAL_REPORT ? 'text-red-500' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
           
           {/* Left: Mobile Toggle & Title/Breadcrumb */}
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
               className="lg:hidden text-gray-400 hover:text-white"
             >
               {isMobileMenuOpen ? <X /> : <Menu />}
             </button>
             
             {/* Mobile Brand Name (Visible only on mobile) */}
             <div className="lg:hidden flex items-center gap-2">
                 <div className="bg-white rounded p-0.5">
                    <Globe className="w-4 h-4 text-purple-600" />
                 </div>
                 <h1 className="text-sm font-bold text-white">GML</h1>
             </div>
           </div>

           {/* Right: User Profile & Actions */}
           <div className="flex items-center gap-4">
              {/* Notification Bell (Visual Only) */}
              <button className="text-gray-400 hover:text-white relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-gray-800"></span>
              </button>
              
              <div className="h-6 w-px bg-gray-700"></div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 hover:bg-gray-700/50 p-1.5 rounded-lg transition-colors"
                >
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-white leading-none">{displayUsername}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{getRoleLabel()}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-md ${getAvatarGradient()}`}>
                      {displayUsername.substring(0, 2)}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-gray-700 md:hidden">
                         <p className="text-sm font-bold text-white">{displayUsername}</p>
                         <p className="text-xs text-gray-500">{userEmail}</p>
                      </div>
                      <div className="p-1">
                          <button 
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg flex items-center gap-2"
                            onClick={() => setIsProfileOpen(false)} // Placeholder for Profile Settings
                          >
                             <Users className="w-4 h-4" /> Profile Settings
                          </button>
                          
                          <div className="my-1 border-t border-gray-700"></div>
                          
                          <button 
                            onClick={() => {
                                setIsProfileOpen(false);
                                handleLogout();
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg flex items-center gap-2 font-medium"
                          >
                             <LogOut className="w-4 h-4" /> Log Out
                          </button>
                      </div>
                  </div>
                )}
              </div>
           </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto pb-10">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;