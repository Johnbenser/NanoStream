import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Key, Bot, User, Trash2, Settings, Loader2, Sparkles, Brain, Clock } from 'lucide-react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const ChatGPTClient: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are a helpful assistant for Global Media Live employees.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) setApiKey(savedKey);
    
    const savedModel = localStorage.getItem('openai_model');
    if (savedModel) setModel(savedModel);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveSettings = () => {
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('openai_model', model);
    setShowSettings(false);
  };

  const clearChat = () => {
    setMessages([{ role: 'system', content: 'You are a helpful assistant for Global Media Live employees.' }]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !apiKey) {
      if (!apiKey) setShowSettings(true);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Prepare request body based on model type
      // o1 models do not support "system" role in some versions or have different token limits, 
      // but current chat/completions usually handles it. 
      // However, max_tokens is often replaced by max_completion_tokens for o1.
      
      const isO1 = model.startsWith('o1');
      
      const payload: any = {
        model: model,
        messages: isO1 
          ? messages.filter(m => m.role !== 'system').concat(userMessage) // o1-preview often rejects system role in beta
          : [...messages, userMessage] 
      };

      // o1 models don't support temperature
      if (!isO1) {
        payload.temperature = 0.7;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const aiMessage: Message = { 
        role: 'assistant', 
        content: data.choices[0].message.content 
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}. Please check your API key or model availability.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden animate-fade-in">
      
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-green-500/20 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">My ChatGPT</h2>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              {model.startsWith('o1') ? <Brain className="w-3 h-3 text-purple-400"/> : <Sparkles className="w-3 h-3"/>}
              Current Model: <span className="text-gray-300 font-mono">{model}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${!apiKey ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="API Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 p-4 animate-in slide-in-from-top-2">
          <div className="max-w-2xl mx-auto space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">OpenAI API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="password"
                  placeholder="sk-..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-9 pr-4 text-white focus:ring-2 focus:ring-green-500 outline-none"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Key is stored locally in your browser.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Model Selection</label>
              <div className="relative">
                <select 
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <optgroup label="Standard (Flagship)">
                    <option value="gpt-4o">GPT-4o (Most Capable & Fast)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Efficient & Cheap)</option>
                  </optgroup>
                  
                  <optgroup label="Extended Thinking (Reasoning)">
                    <option value="o1-preview">o1 Preview (Deep Reasoning)</option>
                    <option value="o1-mini">o1 Mini (Fast Reasoning)</option>
                  </optgroup>

                  <optgroup label="Legacy Models">
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4 (Original)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <Settings className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {model.startsWith('o1') 
                  ? "Note: Reasoning models take longer to 'think' before responding." 
                  : "Standard models respond instantly."}
              </p>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold w-full"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 custom-scrollbar">
        {messages.length === 1 && !apiKey && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <Key className="w-12 h-12 mb-4 opacity-20" />
            <p className="max-w-xs">Please enter your OpenAI API Key in settings to start chatting.</p>
            <button onClick={() => setShowSettings(true)} className="text-green-400 mt-2 hover:underline">Open Settings</button>
          </div>
        )}
        
        {messages.slice(1).map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${model.startsWith('o1') ? 'bg-purple-600' : 'bg-green-600'}`}>
                {model.startsWith('o1') ? <Brain className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
            )}
            
            <div className={`
              max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none'}
            `}>
              {msg.content}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${model.startsWith('o1') ? 'bg-purple-600' : 'bg-green-600'}`}>
                {model.startsWith('o1') ? <Brain className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                {model.startsWith('o1') && <span className="text-xs text-gray-400 italic">Thinking...</span>}
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
          <input
            type="text"
            className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
            placeholder={apiKey ? "Send a message..." : "Set API Key first..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!apiKey || loading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || !apiKey || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:text-gray-500 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatGPTClient;