
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
import ResourceLinks from './components/ResourceLinks';
import BrandManager from './components/BrandManager'; // New Import
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

  // 1. Auth Listener Effect
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
        setUser(firebaseUser);
      } else {
        setUser(null);
        setCreators([]); // Clear data on logout
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Database Listener Effect (Dependent on User)
  useEffect(() => {
    // Only subscribe to DB if user is logged in
    if (!user) return;

    const unsubscribeDb = subscribeToCreators(
      (data) => {
        setCreators(data);
        setDbError(null);
      },
      (error) => {
        console.error("DB Error:", error);
        // Check for specific "API Disabled" error from Firebase
        if (error.message && (error.message.includes('Cloud Firestore API') || error.code === 'permission-denied')) {
          setDbError("Database Access Error: Missing permissions or API disabled.");
        } else {
          setDbError("Database Connection Failed. Check your internet connection.");
        }
      }
    );

    return () => unsubscribeDb();
  }, [user]); // Re-run this effect when 'user' changes

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
        <p className="text-gray-400 animate-pulse">Connecting to Global Media Live...</p>
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
            <div className="mt-3 text-sm text-gray-400">
                <p className="font-semibold text-white mb-1">How to fix:</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center">Firebase Console <ExternalLink className="w-3 h-3 ml-1"/></a>.</li>
                  <li>Click <strong>Firestore Database</strong> {'>'} <strong>Rules</strong>.</li>
                  <li>Ensure rules allow read/write for authenticated users:
                    <pre className="bg-black/30 p-2 rounded mt-1 text-xs font-mono text-green-300">
                      allow read, write: if request.auth != null;
                    </pre>
                  </li>
                </ol>
            </div>
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
          <CreatorList creators={creators} currentUser={user.email} />
        </>
      )}

      {activeView === ViewState.BRANDS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Brands</h2>
            <p className="text-gray-400 mt-2">Product inventory and shop links.</p>
          </div>
          <BrandManager />
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

      {activeView === ViewState.LINKS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Internal Links</h2>
            <p className="text-gray-400 mt-2">Company resources and quick access portals.</p>
          </div>
          <ResourceLinks />
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
