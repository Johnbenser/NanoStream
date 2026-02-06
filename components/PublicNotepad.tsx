
import React, { useState, useEffect } from 'react';
import { FileText, Save, Check, Copy, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { subscribeToPublicNote, savePublicNote } from '../services/storageService';

interface PublicNotepadProps {
  noteId?: string;
  isPublicView?: boolean;
}

const PublicNotepad: React.FC<PublicNotepadProps> = ({ noteId: initialNoteId, isPublicView = false }) => {
  const [noteId, setNoteId] = useState(initialNoteId || '');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  // Load Note Data
  useEffect(() => {
    if (!noteId) return;

    const unsubscribe = subscribeToPublicNote(noteId, (data) => {
      // Only update content if it's significantly different to avoid cursor jumping during active typing if latency is high,
      // but strictly speaking, real-time sync usually wants to show incoming changes. 
      // For a simple notepad, we'll just set it. 
      // Ideally, we'd use a more complex diffing or CRDT, but this is "Simple".
      if (data) {
        // Only override if local content is empty (initial load) or we assume single-user predominant editing
        // A simple check: if remote length is very different or user hasn't typed recently?
        // Let's just set it for now to enable collaboration viewing.
        setContent(prev => {
            // Simple conflict avoidance: if user is typing (status !== saved/idle), maybe don't overwrite?
            // Actually, for this requirement "pure link", simpler is better: Just load it.
            // If the user is typing, React might thrash. 
            // We'll trust Firestore's speed or the user accepting last-write-wins.
            // To make it smoother, we could only set if `prev` is empty.
            if (!prev && data.content) return data.content;
            if (prev !== data.content && status === 'idle') return data.content;
            return prev;
        });
      }
    });
    return () => unsubscribe();
  }, [noteId, status]);

  // Debounced Save
  useEffect(() => {
    if (!noteId || !content) return;

    const handler = setTimeout(async () => {
      setStatus('saving');
      try {
        await savePublicNote(noteId, content);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(handler);
  }, [content, noteId]);

  const handleCreateNew = () => {
    const randomId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    if (isPublicView) {
      // Redirect to new URL
      window.location.search = `?note=${randomId}`;
    } else {
      setNoteId(randomId);
      setContent('');
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?note=${noteId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!noteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 p-8 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
        <FileText className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-white mb-2">Public Notepad</h2>
        <p className="text-center max-w-md mb-6">
          Create a secure, shareable note that can be accessed via a simple link without logging in.
        </p>
        <div className="flex gap-4">
            <button 
                onClick={handleCreateNew}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
            >
                <RefreshCw className="w-4 h-4" /> Create New Note
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isPublicView ? 'min-h-screen bg-gray-900' : 'h-[calc(100vh-140px)] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden'}`}>
      
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/20 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-none">Notepad</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">ID: {noteId}</span>
                {status === 'saving' && <span className="text-xs text-blue-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Saving...</span>}
                {status === 'saved' && <span className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3"/> Saved</span>}
                {status === 'error' && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Save Failed</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={copyLink}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}`}
           >
             {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
             {copied ? 'Copied' : 'Copy Link'}
           </button>
           
           {!isPublicView && (
               <a 
                 href={`/?note=${noteId}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="p-2 bg-gray-700 text-gray-300 hover:text-white rounded-lg hover:bg-gray-600 transition-colors"
                 title="Open in new tab"
               >
                   <ExternalLink className="w-4 h-4" />
               </a>
           )}
        </div>
      </div>

      {/* Editor */}
      <textarea
        className="flex-1 w-full bg-gray-900 text-gray-200 p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
        placeholder="Type anything here... It saves automatically."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
};

export default PublicNotepad;
