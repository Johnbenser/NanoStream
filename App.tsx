import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CreatorList from './components/CreatorList';
import CaptionGenerator from './components/CaptionGenerator';
import ActivityLogs from './components/ActivityLogs';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { ViewState, Creator } from './types';
import { subscribeToCreators } from './services/storageService';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.DASHBOARD);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EDITOR' | 'CSR'>('EDITOR');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch Role
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole('EDITOR'); // Default
          }
        } catch (e) {
          console.error("Error fetching role", e);
          setUserRole('EDITOR');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Database Listener (Real-time Sync)
    const unsubscribeDb = subscribeToCreators(
      (data) => {
        setCreators(data);
        setDbError(null);
      },
      (error) => {
        // Check for specific "API Disabled" error from Firebase
        if (error.message && (error.message.includes('Cloud Firestore API') || error.code === 'permission-denied')) {
          setDbError("Setup Required: The Firestore Database API is not enabled for this project.");
        } else {
          setDbError("Database Connection Failed. Check your internet connection.");
        }
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
    };
  }, []);

  const handleLoginSuccess = () => {
    // Auth listener handles state, this just helps UI transition if needed
    setActiveView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    setActiveView(ViewState.DASHBOARD);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-gray-400 animate-pulse">Connecting to Firebase...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Route Protection
  if (userRole !== 'ADMIN' && (activeView === ViewState.LOGS || activeView === ViewState.USERS)) {
    setActiveView(ViewState.DASHBOARD);
  }

  return (
    <Layout 
      activeView={activeView} 
      onNavigate={setActiveView} 
      onLogout={handleLogout}
      userRole={userRole} // Pass role down
      userEmail={user.email}
    >
      {/* Global Error Banner */}
      {dbError && (
        <div className="bg-red-500/10 border border-red-500/40 p-4 rounded-xl mb-6 flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <h3 className="text-red-400 font-bold">Database Connection Error</h3>
            <p className="text-gray-300 text-sm mt-1">{dbError}</p>
            {dbError.includes("Setup Required") && (
               <div className="mt-3 text-sm text-gray-400">
                  <p>To fix this:</p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center">Firebase Console <ExternalLink className="w-3 h-3 ml-1"/></a>.</li>
                    <li>Select project <strong>nano-stream-d1d91</strong>.</li>
                    <li>Click <strong>Firestore Database</strong> in the left menu.</li>
                    <li>Click <strong>Create Database</strong> (Select Test Mode).</li>
                  </ol>
               </div>
            )}
          </div>
        </div>
      )}

      {activeView === ViewState.DASHBOARD && (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Overview</h2>
            <p className="text-gray-400 mt-2">Real-time performance metrics.</p>
          </div>
          <Dashboard creators={creators} />
        </>
      )}

      {activeView === ViewState.CREATORS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Creator Database</h2>
            <p className="text-gray-400 mt-2">Live-synced database of all creators.</p>
          </div>
          <CreatorList creators={creators} />
        </>
      )}

      {activeView === ViewState.TOOLS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">AI Tools</h2>
            <p className="text-gray-400 mt-2">Generate optimized content strategies.</p>
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
            <p className="text-gray-400 mt-2">Manage user roles and permissions.</p>
          </div>
          <UserManagement />
        </>
      )}
    </Layout>
  );
};

export default App;