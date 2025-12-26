
import React, { ReactNode } from 'react';
import { LayoutDashboard, Users, Sparkles, Menu, X, Shield, LogOut, Lock, Link, Globe, ShoppingBag, ShieldAlert } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Extract username from synthetic email (user@nanostream.internal -> user)
  const displayUsername = userEmail ? userEmail.split('@')[0] : 'User';

  const handleLogout = async () => {
    await addLog('LOGOUT', 'System Exit');
    await logout();
    onLogout();
  };

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.CREATORS, label: 'Creator Database', icon: Users },
    { id: ViewState.BRANDS, label: 'Brands', icon: ShoppingBag }, 
    { id: ViewState.REPORTS, label: 'Violations & Reports', icon: ShieldAlert }, // New Item
    { id: ViewState.TOOLS, label: 'AI Tools', icon: Sparkles },
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
    if (userRole === 'ADMIN') return 'bg-gradient-to-tr from-blue-600 to-cyan-400';
    if (userRole === 'CSR') return 'bg-gradient-to-tr from-orange-400 to-yellow-500';
    return 'bg-gradient-to-tr from-blue-500 to-cyan-500';
  };

  return (
    <div className="min-h-screen flex bg-gray-950 text-gray-100 font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900/80 backdrop-blur-md border-r border-gray-800 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-800 flex flex-col items-center text-center">
            <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl p-2 mb-3 shadow-lg shadow-blue-500/20">
               <Globe className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              Global Media Live
            </h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">AI CONTENT MONITORING</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeView === item.id
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="bg-gray-800/40 rounded-lg p-3 mb-3 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-md ${getAvatarGradient()}`}>
                  {displayUsername.substring(0, 2)}
                </div>
                <div className="overflow-hidden w-full">
                  <p className="text-sm font-medium text-white truncate w-full" title={displayUsername}>{displayUsername}</p>
                  <p className="text-xs text-gray-500">{getRoleLabel()}</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 rounded p-1">
               <Globe className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-lg font-bold text-white">Global Media Live</h1>
           </div>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-300">
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;