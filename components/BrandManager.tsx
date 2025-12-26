
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Folder, FolderOpen, Plus, ShoppingCart, Edit2, Trash2, X, Tag, FileText, Image as ImageIcon, Upload, Loader2, AlertTriangle, Eye, Copy, Check, ArrowUpDown, Search, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { BrandProduct } from '../types';
import { subscribeToBrandProducts, saveBrandProduct, deleteBrandProduct, uploadFile } from '../services/storageService';

const BRANDS = ['Maikalian', 'Xmas Curtain', 'Tshirt', 'Other'];

const BrandManager: React.FC = () => {
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Maikalian');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'date-new' | 'date-old'>('name-asc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    brand: BrandProduct['brand'];
    description: string;
    shopLink: string;
    imageUrl: string;
    images: string[];
  }>({
    name: '',
    brand: 'Maikalian',
    description: '',
    shopLink: '',
    imageUrl: '',
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // View & Delete States
  const [viewerState, setViewerState] = useState<{ images: string[], index: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToBrandProducts(
      (data) => setProducts(data),
      (error) => console.error("Failed to load brands", error)
    );
    return () => unsubscribe();
  }, []);

  // Filter by brand tab AND apply selected sort AND search
  const filteredProducts = products
    .filter(p => p.brand === activeTab && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      // Handle missing dates gracefully (treat as old)
      const dateA = new Date(a.lastUpdated || 0).getTime();
      const dateB = new Date(b.lastUpdated || 0).getTime();
      if (sortOrder === 'date-new') return dateB - dateA;
      if (sortOrder === 'date-old') return dateA - dateB;
      return 0;
    });

  const handleOpenModal = (product?: BrandProduct) => {
    setUploadError(null);
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        brand: product.brand,
        description: product.description,
        shopLink: product.shopLink,
        imageUrl: product.imageUrl || '',
        images: product.images || (product.imageUrl ? [product.imageUrl] : [])
      });
      // Ensure the modal opens in the tab matching the product
      setActiveTab(product.brand);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        brand: activeTab as any, // Default to current tab
        description: '',
        shopLink: '',
        imageUrl: '',
        images: []
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      setUploadError(null);
      try {
          const files = Array.from(e.target.files) as File[];
          const uploadPromises = files.map(file => {
             const path = `brands/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/\s+/g, '_')}`;
             return uploadFile(file, path);
          });
          
          const urls = await Promise.all(uploadPromises);
          
          setFormData(prev => ({
              ...prev,
              images: [...prev.images, ...urls],
              imageUrl: prev.imageUrl || urls[0] // Set main image if empty
          }));

      } catch (error: any) {
          setUploadError(error.message || "Failed to upload images.");
      } finally {
          setUploading(false);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
      setFormData(prev => {
          const newImages = prev.images.filter((_, idx) => idx !== indexToRemove);
          return {
              ...prev,
              images: newImages,
              imageUrl: newImages.length > 0 ? newImages[0] : ''
          };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalLink = formData.shopLink;
      if (finalLink && !finalLink.startsWith('http')) {
        finalLink = 'https://' + finalLink;
      }
      
      // Ensure imageUrl is set to first image in gallery if not set
      let finalImage = formData.imageUrl;
      if (!finalImage && formData.images.length > 0) {
          finalImage = formData.images[0];
      }

      await saveBrandProduct({ 
        ...formData, 
        shopLink: finalLink,
        imageUrl: finalImage
      }, editingId || undefined);
      setIsModalOpen(false);
    } catch (error) {
      alert("Failed to save product");
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (deleteId && deleteName) {
      try {
        await deleteBrandProduct(deleteId, deleteName);
        setDeleteId(null);
        setDeleteName(null);
      } catch (e) {
        alert("Failed to delete product.");
      }
    }
  };

  const handleCopyDetails = (product: BrandProduct) => {
    const text = `Product: ${product.name}\nBrand: ${product.brand}\nLink: ${product.shopLink}\n\n${product.description}`;
    navigator.clipboard.writeText(text);
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBrandColor = (brand: string) => {
    switch(brand) {
      case 'Maikalian': return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
      case 'Xmas Curtain': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Tshirt': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  // --- VIEWER HELPERS ---
  const openViewer = (product: BrandProduct) => {
      const images = product.images && product.images.length > 0 
        ? product.images 
        : (product.imageUrl ? [product.imageUrl] : []);
      
      if (images.length > 0) {
          setViewerState({ images, index: 0 });
      }
  };

  const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setViewerState(prev => {
          if (!prev) return null;
          return { ...prev, index: (prev.index + 1) % prev.images.length };
      });
  };

  const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setViewerState(prev => {
          if (!prev) return null;
          return { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length };
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <ShoppingBag className="w-6 h-6 text-orange-400" />
             Brand & Product Manager
           </h2>
           <p className="text-gray-400 text-sm mt-1">
             Manage product inventory, descriptions, and TikTok Shop links for your creators.
           </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-orange-900/20"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* BRAND FOLDERS / TABS */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-700">
        {BRANDS.map((brand) => (
          <button
            key={brand}
            onClick={() => { setActiveTab(brand); setSearchTerm(''); }}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-t-lg font-medium transition-all whitespace-nowrap border-t border-x border-b-0
              ${activeTab === brand 
                ? 'bg-gray-800 text-white border-gray-700' 
                : 'bg-gray-900/50 text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'}
            `}
          >
            {activeTab === brand ? <FolderOpen className="w-4 h-4 text-orange-400" /> : <Folder className="w-4 h-4" />}
            {brand}
            <span className="bg-gray-900 px-2 py-0.5 rounded-full text-xs text-gray-500">
               {products.filter(p => p.brand === brand).length}
            </span>
          </button>
        ))}
      </div>

      {/* PRODUCTS GRID */}
      <div className="bg-gray-800 rounded-b-xl rounded-tr-xl border border-gray-700 p-6 min-h-[400px]">
        
        {/* Sort & Search Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4 gap-4">
            <div className="text-sm text-gray-400 w-full md:w-auto">
                Showing <span className="text-white font-bold">{filteredProducts.length}</span> items
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search products..."
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 border border-gray-700 shrink-0">
                    <ArrowUpDown className="w-4 h-4 text-gray-500 ml-2" />
                    <select 
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="bg-transparent text-white text-xs font-medium p-1 focus:outline-none cursor-pointer border-none focus:ring-0"
                    >
                    <option value="name-asc" className="bg-gray-900">Name (A-Z)</option>
                    <option value="name-desc" className="bg-gray-900">Name (Z-A)</option>
                    <option value="date-new" className="bg-gray-900">Newest</option>
                    <option value="date-old" className="bg-gray-900">Oldest</option>
                    </select>
                </div>
            </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
            {searchTerm ? <Search className="w-12 h-12 mb-3 opacity-20" /> : <Folder className="w-12 h-12 mb-3 opacity-20" />}
            <p>{searchTerm ? `No results for "${searchTerm}"` : `No products in the ${activeTab} folder.`}</p>
            {!searchTerm && <button onClick={() => handleOpenModal()} className="text-orange-400 hover:text-orange-300 text-sm mt-2 font-medium">Add First Product</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
               // Determine display image: first in array OR legacy field
               const displayImage = (product.images && product.images.length > 0) 
                 ? product.images[0] 
                 : product.imageUrl;
               
               const imageCount = (product.images?.length || 0) + (product.imageUrl && !product.images ? 1 : 0);

               return (
              <div key={product.id} className="bg-gray-900 rounded-xl border border-gray-700 hover:border-orange-500/30 transition-all group relative overflow-hidden flex flex-col animate-fade-in">
                
                {/* Product Image */}
                <div className="w-full h-48 bg-gray-800 relative overflow-hidden border-b border-gray-700 group-hover:opacity-90 transition-opacity">
                  {displayImage ? (
                    <>
                      <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
                      {/* View Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => openViewer(product)}>
                         <div className="bg-black/60 text-white px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <Eye className="w-4 h-4" /> View {imageCount > 1 ? `(${imageCount})` : ''}
                         </div>
                      </div>
                      {imageCount > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                              <Layers className="w-3 h-3" /> +{imageCount - 1}
                          </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-800">
                      <ShoppingBag className="w-12 h-12 opacity-20" />
                    </div>
                  )}
                  {/* Badge */}
                  <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] uppercase font-bold rounded-bl-lg border-b border-l shadow-sm ${getBrandColor(product.brand)}`}>
                    {product.brand}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white pr-2">{product.name}</h3>
                    {displayImage && (
                      <button 
                        onClick={() => openViewer(product)}
                        className="text-gray-500 hover:text-blue-400 md:hidden"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 h-16 overflow-hidden line-clamp-3 flex-1">
                    {product.description || "No description provided."}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-auto">
                    <a 
                      href={product.shopLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline bg-blue-900/10 px-2 py-1 rounded transition-colors"
                    >
                      <ShoppingCart className="w-3 h-3" /> TikTok Shop
                    </a>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCopyDetails(product)} 
                        className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded-md transition-colors"
                        title="Copy Details"
                      >
                         {copiedId === product.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleOpenModal(product)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteClick(product.id, product.name)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* EDIT/ADD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 {editingId ? <Edit2 className="w-4 h-4 text-blue-400"/> : <Plus className="w-4 h-4 text-green-400"/>}
                 {editingId ? 'Edit Product' : 'Add New Product'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               {/* Product Name */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-gray-400 uppercase">Product Name</label>
                 <div className="relative">
                   <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                   <input 
                      required
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="e.g. Red Velvet Curtain"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                   />
                 </div>
               </div>

               {/* Folder / Brand */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-gray-400 uppercase">Brand Folder</label>
                 <div className="relative">
                   <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                   <select 
                      className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none"
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value as any})}
                   >
                     {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                 </div>
               </div>

               {/* Image URL / Upload */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-gray-400 uppercase">Product Images (Gallery)</label>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            placeholder="https://... or Upload -->"
                            value={formData.imageUrl}
                            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                        />
                    </div>
                    <label className={`cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border border-gray-600 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4" />}
                        <span className="text-sm font-medium">Bulk Upload</span>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            multiple // Allow multiple selection 
                            onChange={handleFileChange} 
                            disabled={uploading} 
                        />
                    </label>
                 </div>
                 {uploadError && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-2 rounded text-xs text-red-300 mt-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{uploadError}</span>
                    </div>
                 )}
                 
                 {/* Gallery Preview */}
                 {formData.images.length > 0 && (
                     <div className="grid grid-cols-4 gap-2 mt-2">
                         {formData.images.map((img, idx) => (
                             <div key={idx} className="relative aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group">
                                 <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                                 <button 
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <X className="w-3 h-3" />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
               </div>

               {/* Shop Link */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-gray-400 uppercase">TikTok Shop Link <span className="text-gray-600 normal-case">(Optional)</span></label>
                 <div className="relative">
                   <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                   <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="https://shop.tiktok.com/..."
                      value={formData.shopLink}
                      onChange={e => setFormData({...formData, shopLink: e.target.value})}
                   />
                 </div>
               </div>

               {/* Description */}
               <div className="space-y-2">
                 <label className="text-xs font-medium text-gray-400 uppercase">Description / Notes <span className="text-gray-600 normal-case">(Optional)</span></label>
                 <div className="relative">
                   <FileText className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                   <textarea 
                      rows={4}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                      placeholder="Product details, pricing info, or selling points..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                 </div>
               </div>

               <div className="pt-2">
                 <button type="submit" disabled={uploading} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-orange-900/20 transition-all disabled:opacity-50">
                   {editingId ? 'Update Product' : 'Add to Folder'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE VIEWER MODAL */}
      {viewerState && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setViewerState(null)}
        >
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                <button 
                    onClick={() => setViewerState(null)}
                    className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors p-2"
                >
                    <X className="w-8 h-8" />
                </button>
                
                {/* Navigation Controls */}
                {viewerState.images.length > 1 && (
                    <>
                        <button 
                            onClick={prevImage}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button 
                            onClick={nextImage}
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </>
                )}

                <img 
                    src={viewerState.images[viewerState.index]} 
                    alt="Product Preview" 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-gray-800"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                />
                
                {/* Counter */}
                {viewerState.images.length > 1 && (
                    <div className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full text-white text-sm backdrop-blur-md">
                        {viewerState.index + 1} / {viewerState.images.length}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-gray-800 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Product?</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete <strong>{deleteName}</strong>?</p>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => { setDeleteId(null); setDeleteName(null); }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-900/20 transition-all"
                >
                  Delete
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default BrandManager;
