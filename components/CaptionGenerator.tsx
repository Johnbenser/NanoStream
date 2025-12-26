import React, { useState } from 'react';
import { Sparkles, Hash, Loader2, Copy, TrendingUp, Search } from 'lucide-react';
import { generateTrendCaption } from '../services/geminiService';
import { CaptionResult } from '../types';

const CaptionGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [tone, setTone] = useState('Energetic & Engaging');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptionResult | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !niche) return;

    setLoading(true);
    setResult(null);
    try {
      const data = await generateTrendCaption(topic, niche, tone);
      setResult(data);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to generate caption. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Form */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Trend Caption Generator</h2>
        </div>
        
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Video Topic / Description</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Unboxing the new iPhone 16 Pro Max..."
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Niche</label>
              <input
                required
                type="text"
                placeholder="e.g. Tech Review"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tone</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option>Energetic & Engaging</option>
                <option>Professional & Educational</option>
                <option>Funny & Relatable</option>
                <option>Mysterious & Suspenseful</option>
                <option>Calm & Aesthetic</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-all ${
              loading 
                ? 'bg-gray-700 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg hover:shadow-blue-500/25'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? 'Analyzing Trends...' : 'Generate with Trends'}
          </button>
          
          <p className="text-xs text-center text-gray-500 mt-2">
            Powered by Gemini with Google Search Grounding for real-time trend data.
          </p>
        </form>
      </div>

      {/* Results Display */}
      <div className="space-y-6">
        {result ? (
          <>
            {/* Caption Card */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative group animate-fade-in">
              <button 
                onClick={() => copyToClipboard(result.caption)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Copy Caption"
              >
                <Copy className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Viral Caption</h3>
              <p className="text-lg text-white font-medium leading-relaxed whitespace-pre-wrap">
                {result.caption}
              </p>
            </div>

            {/* Hashtags Card */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 animate-fade-in delay-75">
               <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Trending Hashtags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.hashtags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="bg-gray-900 border border-gray-700 text-pink-400 px-3 py-1 rounded-full text-sm hover:border-pink-500/50 cursor-pointer transition-colors"
                    onClick={() => copyToClipboard(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Strategy Card */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 animate-fade-in delay-150">
               <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Why it works</h3>
              </div>
              <p className="text-sm text-gray-300 italic">
                "{result.strategy}"
              </p>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed p-12">
            <Sparkles className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-center">Enter your video details to get<br/>AI-optimized captions and trends.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptionGenerator;