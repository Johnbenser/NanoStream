import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CreatorList from './components/CreatorList';
import CaptionGenerator from './components/CaptionGenerator';
import ActivityLogs from './components/ActivityLogs';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { ViewState, Creator } from './types';
import { getCreators } from './services/storageService';
import { isAuthenticated, getCurrentUserRole } from './services/authService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.DASHBOARD);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Get current role to protect routes
  const userRole = getCurrentUserRole();

  useEffect(() => {
    // Check auth status on load
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      setAuthLoading(false);
      if (authenticated) {
        refreshCreators();
      }
    };
    checkAuth();
  }, []);

  const refreshCreators = () => {
    setCreators(getCreators());
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    refreshCreators();
    setActiveView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveView(ViewState.DASHBOARD); // Reset view
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
    </div>;
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Route Protection: If non-admin tries to access ADMIN views, redirect to Dashboard
  if (userRole !== 'ADMIN' && (activeView === ViewState.LOGS || activeView === ViewState.USERS)) {
    setActiveView(ViewState.DASHBOARD);
  }

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} onLogout={handleLogout}>
      {activeView === ViewState.DASHBOARD && (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Overview</h2>
            <p className="text-gray-400 mt-2">Welcome back. Here's how your nano-creators are performing.</p>
          </div>
          <Dashboard creators={creators} />
        </>
      )}

      {activeView === ViewState.CREATORS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Creator Database</h2>
            <p className="text-gray-400 mt-2">Manage your creators, track stats, and update contact info.</p>
          </div>
          <CreatorList creators={creators} onRefresh={refreshCreators} />
        </>
      )}

      {activeView === ViewState.TOOLS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">AI Tools</h2>
            <p className="text-gray-400 mt-2">Generate optimized content strategies using live trend data.</p>
          </div>
          <CaptionGenerator />
        </>
      )}

      {activeView === ViewState.LOGS && userRole === 'ADMIN' && (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Audit Logs</h2>
            <p className="text-gray-400 mt-2">Track system access and database modifications.</p>
          </div>
          <ActivityLogs />
        </>
      )}

      {activeView === ViewState.USERS && userRole === 'ADMIN' && (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Team Access</h2>
            <p className="text-gray-400 mt-2">Create accounts for your editors and staff.</p>
          </div>
          <UserManagement />
        </>
      )}
    </Layout>
  );
};

export default App;