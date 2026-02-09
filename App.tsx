
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { logout } from './services/authService'; // Import logout
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList'; // Import new ClientList
import CaptionGenerator from './components/CaptionGenerator';
import CollageMaker from './components/CollageMaker';
import CreditTracker from './components/CreditTracker';
import FGSoraReporter from './components/FGSoraReporter'; // Import New Tool
import ImageHost from './components/ImageHost'; // Import New Image Host Tool
import PublicNotepad from './components/PublicNotepad'; // Import New Public Notepad
import ContentPlanner from './components/ContentPlanner';
import ActivityLogs from './components/ActivityLogs';
import UserManagement from './components/UserManagement';
import ResourceLinks from './components/ResourceLinks';
import BrandManager from './components/BrandManager'; 
import ReportedContent from './components/ReportedContent'; 
import ViralReportGenerator from './components/ViralReportGenerator'; // New Import
import AccountVault from './components/AccountVault'; // New Import
import Login from './components/Login';
import { ViewState, Creator, ReportedVideo } from './types';
import { subscribeToCreators, subscribeToClients, subscribeToReports } from './services/storageService';
import { AlertTriangle, ExternalLink, Sparkles, LayoutGrid, Scale, Bug, Image as ImageIcon, FileText } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.DASHBOARD);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [clients, setClients] = useState<Creator[]>([]); // New State for Clients
  const [reports, setReports] = useState<ReportedVideo[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EDITOR' | 'CSR'>('EDITOR');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Sub-navigation state for Tools View
  const [activeTool, setActiveTool] = useState<'caption' | 'collage' | 'transparency' | 'fgsora' | 'assets' | 'notepad'>('caption');

  // URL Parameter Check for Public Notepad (Bypass Login)
  const [publicNoteId, setPublicNoteId] = useState<string | null>(null);

  useEffect(() => {
    // Check for ?note=xyz parameter
    const params = new URLSearchParams(window.location.search);
    const noteParam = params.get('note');
    if (noteParam) {
      setPublicNoteId(noteParam);
      setLoading(false); // Stop loading immediately
      return;
    }

    // Normal Auth Flow
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
        setCreators([]); 
        setClients([]); // Clear clients
        setReports([]);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Database Listener Effect (Dependent on User)
  useEffect(() => {
    // Only subscribe to DB if user is logged in AND not in public note mode
    if (!user || publicNoteId) return;

    // Creators Subscription
    const unsubscribeCreators = subscribeToCreators(
      (data) => {
        setCreators(data);
        setDbError(null);
      },
      (error) => {
        console.error("DB Error Creators:", error);
        handleDbError(error);
      }
    );

    // Clients Subscription (New)
    const unsubscribeClients = subscribeToClients(
      (data) => {
        setClients(data);
      },
      (error) => {
        console.error("DB Error Clients:", error);
      }
    );

    // Reports Subscription (Added for Dashboard graphs)
    const unsubscribeReports = subscribeToReports(
      (data) => {
        setReports(data);
      },
      (error) => {
         console.error("DB Error Reports:", error);
      }
    );

    return () => {
      unsubscribeCreators();
      unsubscribeClients();
      unsubscribeReports();
    };
  }, [user, publicNoteId]); 

  // 3. Session Timeout Enforcement (8 Hours)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (user && !publicNoteId) {
      const SESSION_KEY = 'gml_session_start';
      const LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours

      let startTime = sessionStorage.getItem(SESSION_KEY);
      
      // If fresh login (or tab refresh without storage), set start time
      if (!startTime) {
        startTime = Date.now().toString();
        sessionStorage.setItem(SESSION_KEY, startTime);
      }

      const elapsed = Date.now() - parseInt(startTime, 10);
      const remaining = LIMIT_MS - elapsed;

      // Set logout timer
      timeoutId = setTimeout(async () => {
        alert("Session limit reached (8 hours). You have been logged out.");
        await logout();
        sessionStorage.removeItem(SESSION_KEY);
        // The onAuthStateChanged will handle setting user to null
      }, Math.max(0, remaining));
    } else {
      // Clean up if user is logged out
      sessionStorage.removeItem('gml_session_start');
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, publicNoteId]);

  const handleDbError = (error: any) => {
    if (error.message && (error.message.includes('Cloud Firestore API') || error.code === 'permission-denied')) {
      setDbError("Database Access Error: Missing permissions or API disabled.");
    } else {
      setDbError("Database Connection Failed. Check your internet connection.");
    }
  };

  const handleLoginSuccess = () => {
    // Auth listener handles state, this just helps UI transition if needed
    setActiveView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    // Clean up session storage manually on explicit logout
    sessionStorage.removeItem('gml_session_start');
    setActiveView(ViewState.DASHBOARD);
  };

  // --- RENDER LOGIC ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-gray-400 animate-pulse">Connecting to Global Media Live...</p>
      </div>
    );
  }

  // PUBLIC NOTE VIEW (No Login Required)
  if (publicNoteId) {
    return <PublicNotepad noteId={publicNoteId} isPublicView={true} />;
  }

  // LOGIN VIEW
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
          <Dashboard creators={creators} reports={reports} />
        </>
      )}

      {/* New Client Brand Section */}
      {activeView === ViewState.CLIENTS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Client Workspaces</h2>
            <p className="text-gray-400 mt-2">Manage Brand Clients and track AI video performance.</p>
          </div>
          <ClientList clients={clients} currentUser={user.email} />
        </>
      )}

      {activeView === ViewState.BRANDS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Product Inventory</h2>
            <p className="text-gray-400 mt-2">Manage products and shop links.</p>
          </div>
          <BrandManager />
        </>
      )}

      {activeView === ViewState.REPORTS && (
         <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Violations & Reports</h2>
            <p className="text-gray-400 mt-2">Track reported content, sanctions, and resolution.</p>
          </div>
          <ReportedContent creators={creators} reports={reports} currentUser={user.email} />
        </>
      )}

      {activeView === ViewState.VIRAL_REPORT && (
        <ViralReportGenerator />
      )}

      {activeView === ViewState.VAULT && (
        <AccountVault currentUser={user.email} />
      )}

      {activeView === ViewState.TOOLS && (
         <>
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h2 className="text-3xl font-bold text-white">Creative Tools</h2>
               <p className="text-gray-400 mt-2">AI-powered utilities for content production.</p>
            </div>
            
            {/* Tool Switcher */}
            <div className="bg-gray-800 p-1 rounded-lg border border-gray-700 flex overflow-x-auto max-w-full">
               <button 
                 onClick={() => setActiveTool('caption')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTool === 'caption' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 <Sparkles className="w-4 h-4" /> Caption AI
               </button>
               <button 
                 onClick={() => setActiveTool('collage')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTool === 'collage' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 <LayoutGrid className="w-4 h-4" /> Collage Maker
               </button>
               <button 
                 onClick={() => setActiveTool('assets')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTool === 'assets' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 <ImageIcon className="w-4 h-4" /> Cloud Assets
               </button>
               <button 
                 onClick={() => setActiveTool('notepad')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTool === 'notepad' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 <FileText className="w-4 h-4" /> Public Notepad
               </button>
               <button 
                 onClick={() => setActiveTool('transparency')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTool === 'transparency' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 <Scale className="w-4 h-4" /> Credit Tracker
               </button>
               <button 
                 onClick={() => setActiveTool('fgsora')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTool === 'fgsora' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 <Bug className="w-4 h-4 text-red-400" /> FG SORA Report
               </button>
            </div>
          </div>
          
          {activeTool === 'caption' ? <CaptionGenerator /> : 
           activeTool === 'collage' ? <CollageMaker /> : 
           activeTool === 'assets' ? <ImageHost /> :
           activeTool === 'notepad' ? <PublicNotepad /> :
           activeTool === 'transparency' ? <CreditTracker /> : 
           <FGSoraReporter />}
        </>
      )}

      {activeView === ViewState.PLANNER && (
        <ContentPlanner clients={clients} />
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
