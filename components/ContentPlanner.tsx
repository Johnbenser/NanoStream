import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, Clock, Video, ChevronLeft, ChevronRight, LayoutList, CalendarDays, X, ShoppingBag, Sparkles, Youtube, Instagram, Music2, Building2 } from 'lucide-react';
import { ContentPlan, Creator } from '../types';
import { subscribeToContentPlans, saveContentPlan, deleteContentPlan } from '../services/storageService';

interface ContentPlannerProps {
  clients?: Creator[]; // List of available clients
}

const ContentPlanner: React.FC<ContentPlannerProps> = ({ clients = [] }) => {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Edit/Create Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Detail View State
  const [viewingPlan, setViewingPlan] = useState<ContentPlan | null>(null);

  const [formData, setFormData] = useState<Omit<ContentPlan, 'id' | 'createdAt'>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    productName: '',
    promptDetails: '',
    clientId: '',
    clientName: '',
    status: 'IDEA',
    notes: '',
    platform: 'TikTok'
  });

  useEffect(() => {
    const unsubscribe = subscribeToContentPlans(
      (data) => setPlans(data),
      (error) => console.error("Failed to sync plans", error)
    );
    return () => unsubscribe();
  }, []);

  // --- ACTIONS ---

  const openCreateForm = (dateOverride?: string) => {
    setEditingId(null);
    setViewingPlan(null); // Close detail view if open
    setFormData({
      title: '',
      date: dateOverride || new Date().toISOString().split('T')[0],
      time: '12:00',
      productName: '',
      promptDetails: '',
      clientId: '',
      clientName: '',
      status: 'IDEA',
      notes: '',
      platform: 'TikTok'
    });
    setIsFormOpen(true);
  };

  const openEditForm = (plan: ContentPlan) => {
    setEditingId(plan.id);
    setViewingPlan(null); // Close detail view
    setFormData({
      title: plan.title,
      date: plan.date,
      time: plan.time || '12:00',
      productName: plan.productName || '',
      promptDetails: plan.promptDetails || '',
      clientId: plan.clientId || '',
      clientName: plan.clientName || '',
      status: plan.status,
      notes: plan.notes,
      platform: plan.platform
    });
    setIsFormOpen(true);
  };

  const openDetailView = (plan: ContentPlan) => {
    setViewingPlan(plan);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveContentPlan(formData, editingId || undefined);
      setIsFormOpen(false);
    } catch (e) {
      alert("Failed to save plan.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete plan "${title}"?`)) {
      await deleteContentPlan(id, title);
      setViewingPlan(null); // Close detail view if open
    }
  };

  // --- HELPERS ---

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'IDEA': return 'bg-gray-700 text-gray-300 border-gray-600';
      case 'SCRIPTING': return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
      case 'FILMING': return 'bg-orange-900/30 text-orange-400 border-orange-500/30';
      case 'EDITING': return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
      case 'READY': return 'bg-green-900/30 text-green-400 border-green-500/30';
      case 'POSTED': return 'bg-purple-900/30 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-700';
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${suffix}`;
  };

  const getPlatformIcon = (platform: string) => {
      switch(platform) {
          case 'YouTube': return <Youtube className="w-4 h-4 text-red-500" />;
          case 'Instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
          default: return <Music2 className="w-4 h-4 text-black bg-white rounded-full p-0.5" />; // TikTok style
      }
  };

  // --- DATE LOGIC ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  // Group plans by date
  const plansByDate = useMemo(() => {
    const grouped: Record<string, ContentPlan[]> = {};
    plans.forEach(p => {
      if (!grouped[p.date]) grouped[p.date] = [];
      grouped[p.date].push(p);
    });
    // Sort each day by time
    Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    });
    return grouped;
  }, [plans]);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate); // 0=Sun
    const startingBlankDays = firstDay === 0 ? 6 : firstDay - 1; // Make Mon=0
    
    const days = [];
    
    // Blanks
    for (let i = 0; i < startingBlankDays; i++) {
        days.push(<div key={`blank-${i}`} className="h-44 bg-gray-900/30 border border-gray-800/50"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayPlans = plansByDate[dateStr] || [];
        const isToday = dateStr === new Date().toISOString().split('T')[0];

        days.push(
            <div key={d} className={`h-44 bg-gray-800 border border-gray-700 p-2 flex flex-col group hover:border-blue-500/30 transition-colors relative ${isToday ? 'bg-blue-900/10 border-blue-500/50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400'}`}>{d}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openCreateForm(dateStr); }}
                      className="text-gray-500 hover:text-white hover:bg-gray-700 rounded p-1 opacity-0 group-hover:opacity-100 transition-all"
                      title="Add Plan"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Event List - No Scroll needed if height is sufficient for 3 items */}
                <div className="flex-1 space-y-1.5 overflow-hidden">
                    {dayPlans.slice(0, 4).map(p => (
                        <div 
                          key={p.id} 
                          onClick={(e) => { e.stopPropagation(); openDetailView(p); }}
                          className={`
                            text-[10px] px-2 py-1.5 rounded-md border cursor-pointer hover:brightness-125 transition-all
                            flex items-center gap-2 shadow-sm
                            ${getStatusColor(p.status)}
                          `}
                        >
                            {/* Time Badge */}
                            <span className="font-mono font-bold opacity-90 min-w-[35px]">{formatTime(p.time)}</span>
                            
                            {/* Title + Client Hint */}
                            <div className="flex-1 min-w-0">
                               <div className="truncate font-medium">{p.title}</div>
                               {p.clientName && <div className="text-[9px] opacity-75 truncate">{p.clientName}</div>}
                            </div>
                            
                            {/* Tiny Platform Icon */}
                            {p.platform === 'TikTok' && <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0"></div>}
                        </div>
                    ))}
                    {dayPlans.length > 4 && (
                        <div className="text-[10px] text-gray-500 text-center italic">
                            + {dayPlans.length - 4} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-7 gap-1 bg-gray-900 p-1 rounded-b-xl border border-gray-700 border-t-0">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-gray-500 text-xs font-bold uppercase py-3 bg-gray-800 border-b border-gray-700">
                    {day}
                </div>
            ))}
            {days}
        </div>
    );
  };

  const renderListView = () => {
    const upcomingPlans = plans
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
            return dateA - dateB;
        });

    return (
        <div className="space-y-4">
            {upcomingPlans.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                    No content planned. Click "Add Content" to start.
                </div>
            ) : (
                upcomingPlans.map(plan => (
                    <div key={plan.id} className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500/30 transition-colors group cursor-pointer" onClick={() => openDetailView(plan)}>
                        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-xs text-gray-500 uppercase">{new Date(plan.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                            <span className="text-xl font-bold text-white">{new Date(plan.date).getDate()}</span>
                            {plan.time && <span className="text-xs text-blue-400 font-mono mt-1">{formatTime(plan.time)}</span>}
                        </div>
                        
                        <div className="flex-1">
                            <h4 className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">{plan.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusColor(plan.status)}`}>
                                    {plan.status}
                                </span>
                                {plan.clientName && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1 border border-gray-600 px-2 py-0.5 rounded-full">
                                        <Building2 className="w-3 h-3"/> {plan.clientName}
                                    </span>
                                )}
                                {plan.productName && (
                                    <span className="text-xs text-orange-400 flex items-center gap-1 border border-orange-500/30 bg-orange-900/10 px-2 py-0.5 rounded-full">
                                        <ShoppingBag className="w-3 h-3"/> {plan.productName}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                                View Details <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-2">
               <CalendarDays className="w-6 h-6 text-blue-400" /> Content Planner
             </h2>
             <p className="text-gray-400 text-sm mt-1">Schedule and track your daily TikTok content pipeline.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-gray-900 p-1 rounded-lg border border-gray-700 flex">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <LayoutList className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <CalendarIcon className="w-4 h-4" />
                </button>
             </div>
             
             <button 
               onClick={() => openCreateForm()}
               className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
             >
                <Plus className="w-4 h-4" /> Add Content
             </button>
          </div>
       </div>

       {/* Calendar Controls (Only for Calendar View) */}
       {viewMode === 'calendar' && (
          <div className="flex items-center justify-between bg-gray-800 p-4 rounded-t-xl border border-gray-700 border-b-0 mt-4">
             <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
             <h3 className="text-lg font-bold text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
             </h3>
             <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"><ChevronRight className="w-5 h-5"/></button>
          </div>
       )}

       {/* Main View Area */}
       <div className={viewMode === 'list' ? 'mt-4' : ''}>
          {viewMode === 'calendar' ? renderCalendar() : renderListView()}
       </div>

       {/* DETAIL VIEW MODAL */}
       {viewingPlan && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-hidden relative">
                <div className={`h-2 w-full ${getStatusColor(viewingPlan.status).split(' ')[0].replace('text-', 'bg-').replace('/30', '')}`}></div>
                
                <button onClick={() => setViewingPlan(null)} className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-gray-300 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 text-sm text-gray-400 font-mono mb-2">
                                <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4"/> {new Date(viewingPlan.date).toLocaleDateString()}</span>
                                {viewingPlan.time && <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {formatTime(viewingPlan.time)}</span>}
                            </div>
                            <h2 className="text-2xl font-bold text-white leading-tight">{viewingPlan.title}</h2>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(viewingPlan.status)}`}>
                                {viewingPlan.status}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold border border-gray-600 bg-gray-700 text-gray-300 flex items-center gap-1">
                                {getPlatformIcon(viewingPlan.platform)} {viewingPlan.platform}
                            </span>
                            {viewingPlan.clientName && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold border border-blue-500/30 bg-blue-900/10 text-blue-400 flex items-center gap-1">
                                    <Building2 className="w-3 h-3"/> {viewingPlan.clientName}
                                </span>
                            )}
                            {viewingPlan.productName && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30 bg-orange-900/10 text-orange-400 flex items-center gap-1">
                                    <ShoppingBag className="w-3 h-3"/> {viewingPlan.productName}
                                </span>
                            )}
                        </div>

                        {viewingPlan.promptDetails && (
                            <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl">
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> AI Prompt / Angle
                                </h4>
                                <p className="text-sm text-purple-100/80 leading-relaxed">{viewingPlan.promptDetails}</p>
                            </div>
                        )}

                        {viewingPlan.notes && (
                            <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-xl">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Script / Notes</h4>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{viewingPlan.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-700">
                        <button 
                            onClick={() => handleDelete(viewingPlan.id, viewingPlan.title)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium text-sm"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Plan
                        </button>
                        <button 
                            onClick={() => openEditForm(viewingPlan)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all font-bold text-sm"
                        >
                            <Edit2 className="w-4 h-4" /> Edit Details
                        </button>
                    </div>
                </div>
            </div>
         </div>
       )}

       {/* ADD/EDIT FORM MODAL */}
       {isFormOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
               <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     {editingId ? <Edit2 className="w-4 h-4 text-blue-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                     {editingId ? 'Edit Content Plan' : 'Plan New Content'}
                  </h3>
                  <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase">Title / Hook</label>
                     <input 
                       required
                       type="text" 
                       placeholder="e.g. Day in the life..."
                       className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                       value={formData.title}
                       onChange={e => setFormData({...formData, title: e.target.value})}
                     />
                  </div>

                  {/* Client Selector */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase">Client (Optional)</label>
                     <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <select 
                           className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                           value={formData.clientId}
                           onChange={(e) => {
                               const selectedClient = clients.find(c => c.id === e.target.value);
                               setFormData({
                                   ...formData, 
                                   clientId: e.target.value,
                                   clientName: selectedClient ? selectedClient.name : ''
                               });
                           }}
                        >
                           <option value="">No specific client</option>
                           {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Schedule Date</label>
                        <input 
                          required
                          type="date" 
                          className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Time</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                            type="time" 
                            className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                            value={formData.time}
                            onChange={e => setFormData({...formData, time: e.target.value})}
                            />
                        </div>
                     </div>
                  </div>

                  {/* Product & Platform */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Product Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Red Curtain"
                          className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.productName}
                          onChange={e => setFormData({...formData, productName: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                        <select 
                          className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                           <option value="IDEA">Idea</option>
                           <option value="SCRIPTING">Scripting</option>
                           <option value="FILMING">Filming</option>
                           <option value="EDITING">Editing</option>
                           <option value="READY">Ready to Post</option>
                           <option value="POSTED">Posted</option>
                        </select>
                     </div>
                  </div>

                  {/* Prompt Details */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> Prompt Details
                     </label>
                     <textarea 
                       rows={3}
                       placeholder="AI Prompt used for generation..."
                       className="w-full bg-purple-900/10 border border-purple-500/30 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none placeholder-purple-300/30"
                       value={formData.promptDetails}
                       onChange={e => setFormData({...formData, promptDetails: e.target.value})}
                     />
                  </div>

                  {/* General Notes */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase">Script / Notes</label>
                     <textarea 
                       rows={3}
                       placeholder="Script details, caption ideas, or production notes..."
                       className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                       value={formData.notes}
                       onChange={e => setFormData({...formData, notes: e.target.value})}
                     />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-gray-800 pb-2">
                     <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white font-medium px-4">Cancel</button>
                     <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg">Save Plan</button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

export default ContentPlanner;