
import React, { useState } from 'react';
import { Calculator, AlertCircle, CheckCircle, PieChart, RefreshCcw, DollarSign, Activity, Video } from 'lucide-react';

interface ReportData {
  batchName: string;
  initialCredits: number;
  costPerVideo: number;
  totalVideos: number;
  badVideos: number;
  goodVideos: number;
  totalSpent: number;
  wastedSpend: number;
  effectiveSpend: number;
  remainingCredits: number;
  efficiency: number;
  timestamp: string;
  modelType?: string;
}

const PRICING_TIERS = [
  { id: 'watermark_pub', label: 'Remove Watermark (Published)', price: 0.01, type: 'REMOVE WATERMARK' },
  { id: 'watermark_draft', label: 'Remove Watermark (Draft)', price: 0.1, type: 'REMOVE WATERMARK' },
  { id: 'ord_10', label: 'Ordinary (10s)', price: 0.09, type: 'ORDINARY' },
  { id: 'ord_15', label: 'Ordinary (15s)', price: 0.09, type: 'ORDINARY' },
  { id: 'pro_25', label: 'Pro (25s)', price: 1.5, type: 'PRO' },
  { id: 'pro_15_hd', label: 'Pro (15s High-Def)', price: 1.5, type: 'PRO' },
  { id: 'custom', label: 'Custom Amount', price: 0, type: 'CUSTOM' },
];

const CreditTracker: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<string>('ord_10');
  const [inputs, setInputs] = useState({
    batchName: '',
    initialCredits: 1000,
    costPerVideo: 0.09, // Default to Ordinary 10s price
    totalVideos: 0,
    badVideos: 0
  });

  const [report, setReport] = useState<ReportData | null>(null);

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tierId = e.target.value;
    setSelectedTier(tierId);
    
    const tier = PRICING_TIERS.find(t => t.id === tierId);
    if (tier && tier.id !== 'custom') {
      setInputs(prev => ({ ...prev, costPerVideo: tier.price }));
    }
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSpent = inputs.totalVideos * inputs.costPerVideo;
    const wastedSpend = inputs.badVideos * inputs.costPerVideo;
    const effectiveSpend = totalSpent - wastedSpend;
    const remaining = inputs.initialCredits - totalSpent;
    const goodVideos = inputs.totalVideos - inputs.badVideos;
    const efficiency = inputs.totalVideos > 0 ? (goodVideos / inputs.totalVideos) * 100 : 0;
    
    const tier = PRICING_TIERS.find(t => t.id === selectedTier);

    setReport({
      batchName: inputs.batchName || `Batch ${new Date().toLocaleTimeString()}`,
      initialCredits: inputs.initialCredits,
      costPerVideo: inputs.costPerVideo,
      totalVideos: inputs.totalVideos,
      badVideos: inputs.badVideos,
      goodVideos,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      wastedSpend: parseFloat(wastedSpend.toFixed(2)),
      effectiveSpend: parseFloat(effectiveSpend.toFixed(2)),
      remainingCredits: parseFloat(remaining.toFixed(2)),
      efficiency,
      timestamp: new Date().toLocaleString(),
      modelType: tier?.type || 'CUSTOM'
    });
  };

  const getTierColor = (type?: string) => {
    switch(type) {
      case 'PRO': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'ORDINARY': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'REMOVE WATERMARK': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      {/* Input Form */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-bold text-white">Credit Usage Calculator</h2>
        </div>

        <form onSubmit={calculate} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Batch Identifier</label>
            <input 
              type="text" 
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="e.g. Sora Batch #001"
              value={inputs.batchName}
              onChange={e => setInputs({...inputs, batchName: e.target.value})}
            />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-400 uppercase">Video Model / Type</label>
             <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <select
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-3 focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                  value={selectedTier}
                  onChange={handleTierChange}
                >
                  {PRICING_TIERS.map(tier => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label} {tier.id !== 'custom' ? `(${tier.price} credits)` : ''}
                    </option>
                  ))}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Current Credits</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="number" 
                  required
                  step="0.01"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  value={inputs.initialCredits}
                  onChange={e => setInputs({...inputs, initialCredits: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Cost Per Video</label>
              <div className="relative mt-1">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="number" 
                  required
                  step="0.001"
                  className={`w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-3 focus:ring-2 focus:ring-green-500 outline-none ${selectedTier !== 'custom' ? 'opacity-70' : ''}`}
                  value={inputs.costPerVideo}
                  onChange={e => {
                    setInputs({...inputs, costPerVideo: Number(e.target.value)});
                    if (selectedTier !== 'custom') setSelectedTier('custom');
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 space-y-4">
             <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Total Videos Generated</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0"
                  value={inputs.totalVideos}
                  onChange={e => setInputs({...inputs, totalVideos: Number(e.target.value)})}
                />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-400 uppercase text-red-400">Failed / Bad Videos</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-gray-800 border border-red-500/30 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="0"
                  value={inputs.badVideos}
                  onChange={e => setInputs({...inputs, badVideos: Number(e.target.value)})}
                />
                <p className="text-[10px] text-gray-500 mt-1">Videos that were generated but unusable (glitches, poor quality, etc.)</p>
             </div>
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2">
            <PieChart className="w-5 h-5" /> Generate Transparency Report
          </button>
        </form>
      </div>

      {/* Report Display */}
      <div className="space-y-6">
        {report ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
             <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b border-gray-700">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Transparency Report</h3>
                      <h2 className="text-2xl font-bold text-white mt-1">{report.batchName}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTierColor(report.modelType)}`}>
                            {report.modelType}
                        </span>
                        <p className="text-xs text-gray-500">{report.timestamp}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-xs text-gray-400 uppercase font-bold">Remaining Balance</div>
                      <div className={`text-3xl font-mono font-bold ${report.remainingCredits < 0 ? 'text-red-500' : 'text-green-400'}`}>
                        {report.remainingCredits.toLocaleString()}
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-6 space-y-6">
                
                {/* Visual Bar */}
                <div>
                   <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-green-400">Effective Spend ({report.effectiveSpend})</span>
                      <span className="text-red-400">Wasted ({report.wastedSpend})</span>
                   </div>
                   <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-green-500 transition-all duration-1000" 
                        style={{ width: `${report.efficiency}%` }}
                      ></div>
                      <div 
                        className="h-full bg-red-500 transition-all duration-1000" 
                        style={{ width: `${100 - report.efficiency}%` }}
                      ></div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                         <CheckCircle className="w-4 h-4 text-green-400" />
                         <span className="text-xs font-bold text-green-300 uppercase">Good Generations</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{report.goodVideos}</div>
                      <div className="text-xs text-gray-400 mt-1">Cost: {report.effectiveSpend} credits</div>
                   </div>
                   <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                         <AlertCircle className="w-4 h-4 text-red-400" />
                         <span className="text-xs font-bold text-red-300 uppercase">Bad / Wasted</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{report.badVideos}</div>
                      <div className="text-xs text-gray-400 mt-1">Loss: {report.wastedSpend} credits</div>
                   </div>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-sm space-y-2">
                   <div className="flex justify-between">
                      <span className="text-gray-400">Total Videos Generated</span>
                      <span className="text-white font-bold">{report.totalVideos}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-400">Cost Per Generation</span>
                      <span className="text-white font-bold">{report.costPerVideo} credits</span>
                   </div>
                   <div className="border-t border-gray-700 my-2 pt-2 flex justify-between">
                      <span className="text-gray-300">Total Credits Consumed</span>
                      <span className="text-white font-bold">{report.totalSpent}</span>
                   </div>
                </div>

                <div className="text-center">
                   <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                      report.efficiency >= 80 ? 'bg-green-900/20 text-green-400 border-green-500/30' : 
                      report.efficiency >= 50 ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' : 
                      'bg-red-900/20 text-red-400 border-red-500/30'
                   }`}>
                      Batch Efficiency: {report.efficiency.toFixed(1)}%
                   </span>
                </div>
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed p-12">
             <RefreshCcw className="w-16 h-16 mb-4 opacity-20" />
             <p className="text-center">Enter batch details to calculate<br/>credit usage and loss.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditTracker;
