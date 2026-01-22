
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Trash2, Image as ImageIcon, LayoutGrid, Monitor, Smartphone, RefreshCw, Type, Sparkles, AlertCircle, Grid3x3, Square, LayoutPanelLeft, LayoutPanelTop, PanelLeft, MoreVertical, FileUp } from 'lucide-react';
import { analyzeProductImages } from '../services/geminiService';

type LayoutType = 'single' | 'grid-3' | 'grid-4' | 'grid-5' | 'grid-6' | 'grid-7' | 'grid-9';

const CollageMaker: React.FC = () => {
  const [layout, setLayout] = useState<LayoutType>('grid-4');
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [imageCaptions, setImageCaptions] = useState<string[]>(['', '', '', '']);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '1056:4032'>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Dropdown / Menu State
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Drag and Drop State
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Nano Banana / Overlay State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
    let count = 4;
    if (newLayout === 'single') count = 1;
    if (newLayout === 'grid-3') count = 3;
    if (newLayout === 'grid-5') count = 5;
    if (newLayout === 'grid-6') count = 6;
    if (newLayout === 'grid-7') count = 7;
    if (newLayout === 'grid-9') count = 9;

    // Resize arrays while preserving existing data
    const newImages = [...images];
    const newCaptions = [...imageCaptions];

    if (newImages.length < count) {
      while (newImages.length < count) {
        newImages.push(null);
        newCaptions.push('');
      }
    } else {
      newImages.length = count;
      newCaptions.length = count;
    }
    setImages(newImages);
    setImageCaptions(newCaptions);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      const newImages = [...images];
      newImages[index] = imageUrl;
      setImages(newImages);
      setActiveDropdown(null); // Close menu after selection
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we are actually leaving the container (and not just entering a child element)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file);
        const newImages = [...images];
        newImages[index] = imageUrl;
        setImages(newImages);
      }
    }
  };
  // ------------------------------

  const triggerUpload = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing dropdown immediately
    fileInputRefs.current[index]?.click();
    setActiveDropdown(null);
  };

  const removeImage = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newImages = [...images];
    newImages[index] = null;
    const newCaptions = [...imageCaptions];
    newCaptions[index] = '';
    setImages(newImages);
    setImageCaptions(newCaptions);
    setActiveDropdown(null);
  };

  const toggleDropdown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent window click listener from closing it immediately
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  const handleNanoBananaAnalysis = async () => {
    const hasImages = images.some(img => img !== null);
    if (!hasImages) {
        setAnalysisError("Please upload at least one image first.");
        return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
        const result = await analyzeProductImages(images);
        setImageCaptions(result.labels);
    } catch (error: any) {
        setAnalysisError("Nano Banana failed to analyze. Try manual entry.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const drawImageCover = (
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    x: number, 
    y: number, 
    w: number, 
    h: number
  ) => {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let renderW = w;
    let renderH = h;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > boxRatio) {
      renderW = h * imgRatio;
      offsetX = (w - renderW) / 2;
    } else {
      renderH = w / imgRatio;
      offsetY = (h - renderH) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
    ctx.restore();
  };

  const getCellGeometry = (index: number, totalW: number, totalH: number) => {
    if (layout === 'single') {
        return { x: 0, y: 0, w: totalW, h: totalH };
    }
    else if (layout === 'grid-4') {
        const w = totalW / 2;
        const h = totalH / 2;
        const col = index % 2;
        const row = Math.floor(index / 2);
        return { x: col * w, y: row * h, w, h };
    } 
    else if (layout === 'grid-9') {
        const w = totalW / 3;
        const h = totalH / 3;
        const col = index % 3;
        const row = Math.floor(index / 3);
        return { x: col * w, y: row * h, w, h };
    } 
    else if (layout === 'grid-3') {
        // 0: Left Half (Hero)
        // 1-2: Right Half (Stacked)
        if (index === 0) {
            return { x: 0, y: 0, w: totalW / 2, h: totalH };
        } else {
            const subIndex = index - 1;
            const subH = totalH / 2;
            return { x: totalW / 2, y: subIndex * subH, w: totalW / 2, h: subH };
        }
    }
    else if (layout === 'grid-5') {
        // 0: Left Half (Hero)
        // 1-4: Right Half (2x2)
        if (index === 0) {
            return { x: 0, y: 0, w: totalW / 2, h: totalH };
        } else {
            const subIndex = index - 1;
            const subW = totalW / 4;
            const subH = totalH / 2;
            const subCol = subIndex % 2;
            const subRow = Math.floor(subIndex / 2);
            return { x: (totalW / 2) + (subCol * subW), y: subRow * subH, w: subW, h: subH };
        }
    }
    else if (layout === 'grid-6') {
        // 3 Cols x 2 Rows Uniform
        const w = totalW / 3;
        const h = totalH / 2;
        const col = index % 3;
        const row = Math.floor(index / 3);
        return { x: col * w, y: row * h, w, h };
    }
    else if (layout === 'grid-7') {
        // 0: Top Half (Hero)
        // 1-6: Bottom Half (3 cols x 2 rows)
        if (index === 0) {
            return { x: 0, y: 0, w: totalW, h: totalH / 2 };
        } else {
            const subIndex = index - 1;
            const subW = totalW / 3;
            const subH = totalH / 4; // Because bottom half is H/2, split into 2 rows is H/4
            const subCol = subIndex % 3;
            const subRow = Math.floor(subIndex / 3);
            return { x: subCol * subW, y: (totalH / 2) + (subRow * subH), w: subW, h: subH };
        }
    }
    return { x: 0, y: 0, w: totalW, h: totalH };
  };

  const generateCollage = async () => {
    setIsGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set Dimensions (High Res)
    let width = 2048;
    let height = 2048;

    if (aspectRatio === '16:9') {
      width = 3840; // 4K width
      height = 2160;
    } else if (aspectRatio === '9:16') {
      width = 2160;
      height = 3840;
    } else if (aspectRatio === '1056:4032') {
      width = 1056;
      height = 4032;
    }

    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Load and draw images
    const loadPromises = images.map((src) => {
      if (!src) return Promise.resolve(null);
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });
    });

    const loadedImages = await Promise.all(loadPromises);

    loadedImages.forEach((img, index) => {
      const geo = getCellGeometry(index, width, height);

      if (img) {
        drawImageCover(ctx, img, geo.x, geo.y, geo.w, geo.h);
        
        // --- DRAW CAPTION FOR THIS SLOT ---
        const caption = imageCaptions[index];
        if (caption && caption.trim().length > 0) {
            const padding = 24;
            const maxTextWidth = geo.w - (padding * 4);
            
            // Font sizing relative to cell height
            let fontSize = Math.floor(geo.h * 0.05); 
            // Clamp font size reasonable limits
            if (fontSize > 60) fontSize = 60;
            if (fontSize < 24) fontSize = 24;

            ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
            
            // Auto-scale font down if text is too wide
            let metrics = ctx.measureText(caption);
            while (metrics.width > maxTextWidth && fontSize > 16) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
                metrics = ctx.measureText(caption);
            }
            
            const textWidth = metrics.width;
            const boxHeight = fontSize * 1.6; 
            const boxWidth = textWidth + fontSize; 
            
            // Position: Bottom Left of the CELL with padding
            const boxX = geo.x + padding;
            const boxY = geo.y + geo.h - padding - boxHeight;
            
            // Draw Background Box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; 
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

            // Draw Text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(caption, boxX + (fontSize / 2), boxY + (boxHeight / 2));
        }

      } else {
        // Draw placeholder
        ctx.fillStyle = '#1f2937'; 
        ctx.fillRect(geo.x, geo.y, geo.w, geo.h);
        ctx.strokeStyle = '#374151';
        ctx.strokeRect(geo.x, geo.y, geo.w, geo.h);
        
        ctx.fillStyle = '#4b5563';
        const fontSize = Math.min(geo.w, geo.h) * 0.15;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, geo.x + geo.w / 2, geo.y + geo.h / 2);
      }
    });

    // Optional: Draw Dividers logic (simplified: stroke everything)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    loadedImages.forEach((_, index) => {
        const geo = getCellGeometry(index, width, height);
        ctx.strokeRect(geo.x, geo.y, geo.w, geo.h);
    });

    // Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Sora_Grid_${layout}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    setIsGenerating(false);
  };

  // CSS Grid Class Generator for Preview
  const getGridClass = () => {
    switch(layout) {
        case 'single': return 'grid-cols-1 grid-rows-1';
        case 'grid-3': return 'grid-cols-2 grid-rows-2';
        case 'grid-4': return 'grid-cols-2 grid-rows-2';
        case 'grid-9': return 'grid-cols-3 grid-rows-3';
        case 'grid-5': return 'grid-cols-4 grid-rows-2'; // 1 Hero (2x2), 4 Small
        case 'grid-6': return 'grid-cols-3 grid-rows-2'; // 3x2 uniform
        case 'grid-7': return 'grid-cols-3 grid-rows-4'; // 1 Hero Top (3x2), 6 Small (3x2) - effectively 4 rows high
        default: return 'grid-cols-2';
    }
  };

  const getCellClass = (index: number) => {
    if (layout === 'grid-3') {
        if (index === 0) return 'row-span-2'; // Left Hero
        return '';
    }
    if (layout === 'grid-5') {
        if (index === 0) return 'col-span-2 row-span-2';
        return 'col-span-1 row-span-1';
    }
    if (layout === 'grid-7') {
        if (index === 0) return 'col-span-3 row-span-2'; // Top Half
        return 'col-span-1 row-span-1';
    }
    return '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
           <div className="flex items-center gap-2 mb-4">
             <LayoutGrid className="w-5 h-5 text-purple-400" />
             <h3 className="font-bold text-white">Collage Settings</h3>
           </div>
           
           <div className="space-y-6">
              
              {/* Layout Selector */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Grid Layout</label>
                <div className="grid grid-cols-6 gap-2">
                    <button 
                        onClick={() => handleLayoutChange('single')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'single' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Single Image"
                    >
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[10px]">1</span>
                    </button>
                    <button 
                        onClick={() => handleLayoutChange('grid-3')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'grid-3' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Hero Left (3)"
                    >
                        <PanelLeft className="w-5 h-5" />
                        <span className="text-[10px]">3</span>
                    </button>
                    <button 
                        onClick={() => handleLayoutChange('grid-4')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'grid-4' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Classic 4"
                    >
                        <LayoutGrid className="w-5 h-5" />
                        <span className="text-[10px]">4</span>
                    </button>
                    <button 
                        onClick={() => handleLayoutChange('grid-5')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'grid-5' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Hero Left (5)"
                    >
                        <LayoutPanelLeft className="w-5 h-5" />
                        <span className="text-[10px]">5</span>
                    </button>
                    <button 
                        onClick={() => handleLayoutChange('grid-6')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'grid-6' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Grid 3x2 (6)"
                    >
                        <Grid3x3 className="w-5 h-5" />
                        <span className="text-[10px]">6</span>
                    </button>
                    <button 
                        onClick={() => handleLayoutChange('grid-7')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'grid-7' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Hero Top (7)"
                    >
                        <LayoutPanelTop className="w-5 h-5" />
                        <span className="text-[10px]">7</span>
                    </button>
                    <button 
                        onClick={() => handleLayoutChange('grid-9')}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${layout === 'grid-9' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                        title="Grid 3x3 (9)"
                    >
                        <Grid3x3 className="w-5 h-5" />
                        <span className="text-[10px]">9</span>
                    </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Output Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2">
                   <button 
                     onClick={() => setAspectRatio('1:1')}
                     className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${aspectRatio === '1:1' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                   >
                      <Square className="w-5 h-5" />
                      <span className="text-xs">Square</span>
                   </button>
                   <button 
                     onClick={() => setAspectRatio('16:9')}
                     className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${aspectRatio === '16:9' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                   >
                      <Monitor className="w-5 h-5" />
                      <span className="text-xs">16:9</span>
                   </button>
                   <button 
                     onClick={() => setAspectRatio('9:16')}
                     className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${aspectRatio === '9:16' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                   >
                      <Smartphone className="w-5 h-5" />
                      <span className="text-xs">9:16</span>
                   </button>
                   <button 
                     onClick={() => setAspectRatio('1056:4032')}
                     className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${aspectRatio === '1056:4032' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                   >
                      <Smartphone className="w-5 h-5 scale-y-125" />
                      <span className="text-[10px] text-center leading-none">Tall<br/>1056x4032</span>
                   </button>
                </div>
              </div>

              {/* IMAGE ANNOTATIONS */}
              <div className="border-t border-gray-700 pt-4">
                 <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Type className="w-3 h-3" /> Image Annotations
                    </label>
                 </div>
                 
                 <button 
                    onClick={handleNanoBananaAnalysis}
                    disabled={isAnalyzing}
                    className="w-full mb-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                 >
                    {isAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                    {isAnalyzing ? 'Nano Banana Thinking...' : 'Auto-fill with Nano Banana'}
                 </button>
                 
                 {analysisError && (
                    <div className="flex items-center gap-1 text-red-400 text-xs mb-4">
                        <AlertCircle className="w-3 h-3" /> {analysisError}
                    </div>
                 )}

                 <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {images.map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-500 w-4">#{index + 1}</span>
                            <input 
                                type="text"
                                placeholder={`Label for Image ${index + 1}`}
                                className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:ring-1 focus:ring-purple-500 outline-none"
                                value={imageCaptions[index] || ''}
                                onChange={(e) => {
                                    const newCaptions = [...imageCaptions];
                                    newCaptions[index] = e.target.value;
                                    setImageCaptions(newCaptions);
                                }}
                            />
                        </div>
                    ))}
                 </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm text-blue-200">
                <p className="mb-2 font-bold">Tip for Sora/AI Video:</p>
                <p>Specific labels (e.g. "14 inch", "1kg") help the video generation model maintain consistency in scale.</p>
              </div>

              <button 
                onClick={generateCollage}
                disabled={isGenerating || images.every(i => i === null)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" />}
                {isGenerating ? 'Merging...' : 'Download Reference Image'}
              </button>
           </div>
        </div>
      </div>

      {/* Grid Editor */}
      <div className="lg:col-span-2">
        <div className={`bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-4 aspect-square ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1056:4032' ? 'aspect-[1056/4032]' : ''} transition-all duration-300 relative group/preview`}>
           <div className={`grid h-full gap-1 ${getGridClass()}`}>
              {images.map((_, index) => (
                <div 
                   key={index} 
                   className={`
                      relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 
                      ${getCellClass(index)} 
                      ${dragOverIndex === index ? 'border-purple-500 bg-gray-750 ring-2 ring-purple-500/50 scale-[0.98] opacity-80' : 'hover:border-gray-500'}
                      transition-all duration-200
                   `}
                   onDragOver={handleDragOver}
                   onDragEnter={(e) => handleDragEnter(e, index)}
                   onDragLeave={(e) => handleDragLeave(e, index)}
                   onDrop={(e) => handleDrop(e, index)}
                >
                   {images[index] ? (
                     <>
                        <img src={images[index]!} alt={`Slot ${index}`} className="w-full h-full object-cover pointer-events-none" />
                        
                        {/* Dropdown Menu Trigger */}
                        <div className="absolute top-2 right-2 z-30">
                           <button 
                             onClick={(e) => toggleDropdown(index, e)} 
                             className="p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
                           >
                              <MoreVertical className="w-4 h-4" />
                           </button>

                           {activeDropdown === index && (
                             <div className="absolute right-0 mt-2 w-36 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                  onClick={(e) => triggerUpload(index, e)}
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                                >
                                  <FileUp className="w-3 h-3" /> Replace Image
                                </button>
                                <button 
                                  onClick={(e) => removeImage(index, e)}
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                             </div>
                           )}
                        </div>
                        
                        {/* Caption Preview Overlay */}
                        {imageCaptions[index] && (
                            <div className="absolute bottom-2 left-2 z-10 bg-black/70 px-2 py-1 rounded text-xs text-white backdrop-blur-sm max-w-[90%] truncate pointer-events-none">
                                {imageCaptions[index]}
                            </div>
                        )}
                     </>
                   ) : (
                     <div className="w-full h-full relative">
                        {/* Standard Click Area */}
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-750 transition-colors">
                            <div className={`p-2 rounded-full mb-1 transition-all ${dragOverIndex === index ? 'bg-purple-600 text-white animate-bounce' : 'bg-gray-700 text-gray-400'}`}>
                                <Upload className="w-4 h-4" />
                            </div>
                            <span className={`font-medium text-xs transition-colors ${dragOverIndex === index ? 'text-purple-300' : 'text-gray-500'}`}>
                                {dragOverIndex === index ? 'Drop here' : `#${index + 1}`}
                            </span>
                            {/* Hidden Input controlled by both Label click and Dropdown */}
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={el => { if (el) fileInputRefs.current[index] = el; }}
                                onChange={(e) => handleImageUpload(e, index)} 
                            />
                        </label>

                        {/* Dropdown Menu Trigger for Empty State (Explicit Upload Option) */}
                        <div className="absolute top-2 right-2 z-30">
                           <button 
                             onClick={(e) => toggleDropdown(index, e)} 
                             className="p-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-colors"
                           >
                              <MoreVertical className="w-4 h-4" />
                           </button>

                           {activeDropdown === index && (
                             <div className="absolute right-0 mt-2 w-36 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                  onClick={(e) => triggerUpload(index, e)}
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-blue-400 hover:bg-gray-700 hover:text-blue-300 flex items-center gap-2"
                                >
                                  <FileUp className="w-3 h-3" /> Upload Image
                                </button>
                             </div>
                           )}
                        </div>
                     </div>
                   )}
                   <div className="absolute top-1 left-1 bg-black/50 px-1.5 py-0.5 rounded text-[8px] text-white font-mono pointer-events-none z-0">
                      #{index + 1}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CollageMaker;
