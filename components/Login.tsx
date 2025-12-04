import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, UserPlus, Key } from 'lucide-react';
import { login, register } from '../services/authService';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountKey, setAccountKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Internal domain to satisfy Firebase Email requirement while using Usernames
  const INTERNAL_DOMAIN = '@nanostream.internal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Construct synthetic email
    const syntheticEmail = `${username.trim().replace(/\s+/g, '')}${INTERNAL_DOMAIN}`;

    try {
      if (isLogin) {
        await login(syntheticEmail, password);
      } else {
        // Validation for Account Key
        if (accountKey !== 'GMLIVE') {
          throw new Error('Invalid Account Key. Access Denied.');
        }
        await register(syntheticEmail, password, username);
      }
      onLoginSuccess();
    } catch (err: any) {
      if (err.message === 'Invalid Account Key. Access Denied.') {
        setError(err.message);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid username or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('That username is already taken.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Login not enabled. Go to Firebase Console -> Authentication and enable Email/Password.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full backdrop-blur-sm mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">NanoStream Cloud</h1>
          <p className="text-purple-100 text-sm mt-2">Employee Workspace</p>
        </div>
        
        {/* Toggle Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${isLogin ? 'text-white border-b-2 border-purple-500 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'}`}
          >
            Sign In
          </button>
          <button 
             onClick={() => { setIsLogin(false); setError(''); }}
             className={`flex-1 py-4 text-sm font-medium transition-colors ${!isLogin ? 'text-white border-b-2 border-purple-500 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'}`}
          >
            Create Account
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  required
                  className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-500 ml-1">Must be at least 6 characters.</p>
              )}
            </div>

            {/* Account Key Field - Registration Only */}
            {!isLogin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium text-purple-400">Account Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-900 border border-purple-500/50 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                    placeholder="Enter Employee Key"
                    value={accountKey}
                    onChange={(e) => setAccountKey(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500 ml-1">Required for employee verification.</p>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-white text-gray-900 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (isLogin ? 'Signing In...' : 'Verifying Key...') : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && (isLogin ? <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-4 h-4" />)}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;