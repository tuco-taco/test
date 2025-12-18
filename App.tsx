
import React, { useState, useEffect, useRef } from 'react';
import { MenuConfig, MenuItem, DietaryTag, ImageTheme } from './types';
import { DEFAULT_MENU, DIETARY_DATA, IMAGE_THEMES } from './constants';
import MenuBoard from './components/MenuBoard';
import { generateFoodImage, extractMenuItemsFromImage, improveDescription } from './services/geminiService';
import { encodeMenuConfig, decodeMenuConfig, updateUrlHash } from './sharing';

const App: React.FC = () => {
  const [config, setConfig] = useState<MenuConfig>(DEFAULT_MENU);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImproving, setIsImproving] = useState<string | null>(null);
  const [isDisplayMode, setIsDisplayMode] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  // Hydrate from URL on mount
  useEffect(() => {
    const hydrate = async () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        try {
          const shared = await decodeMenuConfig(hash);
          if (shared) {
            setConfig(shared);
          }
        } catch (e) {
          console.error("Hydration failed", e);
        }
      }
      setIsHydrating(false);
    };
    hydrate();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDisplayMode) {
        setIsDisplayMode(false);
      }
      if ((e.key === 'f' || e.key === 'F') && !isDisplayMode && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsDisplayMode(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDisplayMode]);

  const handleAddItem = () => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: 'New Sandwich',
      description: 'Hand-crafted with fresh ingredients',
      price: '$9.95',
      dietary: [],
      isSoldOut: false
    };
    setConfig(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleUpdateItem = (id: string, updates: Partial<MenuItem>) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveItem = (id: string) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleImproveCopy = async (item: MenuItem) => {
    setIsImproving(item.id);
    const newDesc = await improveDescription(item.name, item.description);
    handleUpdateItem(item.id, { description: newDesc });
    setIsImproving(null);
  };

  const handleGenerateAllImages = async () => {
    setIsGeneratingAll(true);
    const updatedItems = [...config.items];
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      if (item.name && item.name !== 'New Sandwich') {
        const imageUrl = await generateFoodImage(item.name, item.description, config.imageTheme);
        if (imageUrl) {
          updatedItems[i] = { ...item, imageUrl };
          setConfig(prev => ({ ...prev, items: [...updatedItems] }));
        }
      }
    }
    setIsGeneratingAll(false);
  };

  const handleGenerateSingleItemImage = async (item: MenuItem) => {
    const imageUrl = await generateFoodImage(item.name, item.description, config.imageTheme);
    if (imageUrl) {
      handleUpdateItem(item.id, { imageUrl });
    }
  };

  const triggerItemImageUpload = (id: string) => {
    setCurrentUploadId(id);
    fileInputRef.current?.click();
  };

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleUpdateItem(currentUploadId, { imageUrl: base64 });
      setCurrentUploadId(null);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setConfig(prev => ({ ...prev, logoUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleMenuImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const extractedItems = await extractMenuItemsFromImage(base64);
      if (extractedItems.length > 0) {
        setConfig(prev => ({
          ...prev,
          items: extractedItems.map((item, idx) => ({ ...item, id: idx.toString(), isSoldOut: false }))
        }));
      }
      setIsExtracting(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleDietary = (itemId: string, tag: DietaryTag) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const current = item.dietary || [];
          const updated = current.includes(tag) 
            ? current.filter(t => t !== tag)
            : [...current, tag];
          return { ...item, dietary: updated };
        }
        return item;
      })
    }));
  };

  const handleShareMenu = async () => {
    try {
      const encoded = await encodeMenuConfig(config);
      updateUrlHash(encoded);
      
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error("Could not share menu", err);
      alert("This menu is too large to share via a standard link (likely due to many high-resolution images). Try removing some images or shortening item descriptions.");
    }
  };

  if (isHydrating) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white z-[10000]">
        <div className="w-16 h-16 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-6 shadow-lg shadow-sky-500/20"></div>
        <h2 className="text-xl font-black tracking-tight uppercase">Loading Shared Menu</h2>
        <p className="text-slate-400 text-sm mt-2 animate-pulse">Decompressing layout and assets...</p>
      </div>
    );
  }

  if (isDisplayMode) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center overflow-hidden cursor-none">
        <div className="w-full h-full max-w-full max-h-full flex items-center justify-center p-0 m-0">
          <div className="relative w-full max-h-full aspect-[16/9] bg-black">
            <MenuBoard config={config} />
          </div>
        </div>
        <button 
          onClick={() => setIsDisplayMode(false)}
          className="fixed top-4 right-4 bg-black/50 hover:bg-black text-white px-4 py-2 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-default text-xs font-bold"
        >
          Exit (Esc)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleItemImageUpload} 
      />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-tv text-sm"></i>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">Deli<span className="text-sky-500">Board</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <label className="cursor-pointer bg-white border border-slate-300 hover:border-sky-500 hover:text-sky-600 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
              <i className="fas fa-file-import"></i>
              {isExtracting ? 'Analyzing...' : 'Import Menu'}
              <input type="file" className="hidden" accept="image/*" onChange={handleMenuImport} disabled={isExtracting} />
            </label>
            <button 
              onClick={handleGenerateAllImages}
              disabled={isGeneratingAll}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md"
            >
              <i className={`fas ${isGeneratingAll ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
              {isGeneratingAll ? 'Generating...' : 'AI Food Photos'}
            </button>
            <button 
              onClick={handleShareMenu}
              className={`${isCopying ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-900'} text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md min-w-[140px] justify-center`}
            >
              <i className={`fas ${isCopying ? 'fa-check' : 'fa-share-nodes'}`}></i>
              {isCopying ? 'Link Copied!' : 'Share Menu'}
            </button>
            <button 
              onClick={() => setIsDisplayMode(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md ring-4 ring-sky-500/10"
            >
              <i className="fas fa-play"></i> Launch
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-8 grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'content' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-edit mr-2"></i> Content
              </button>
              <button 
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'design' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-palette mr-2"></i> Design
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'content' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deli Name</label>
                      <input 
                        type="text" 
                        value={config.title}
                        onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Board Subtitle</label>
                      <textarea 
                        value={config.subtitle}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all h-20 resize-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800">Sandwiches & Subs</h3>
                      <button 
                        onClick={handleAddItem}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    
                    <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                      {config.items.map((item) => (
                        <div key={item.id} className={`p-4 border transition-all rounded-xl relative ${item.isSoldOut ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-slate-50 border-slate-200 hover:border-sky-200'}`}>
                          <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 relative group/img shadow-inner">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <i className="fas fa-burger text-2xl"></i>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleGenerateSingleItemImage(item)}
                                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                                  title="AI Regenerate"
                                >
                                  <i className="fas fa-sync-alt text-xs"></i>
                                </button>
                                <button 
                                  onClick={() => triggerItemImageUpload(item.id)}
                                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                                  title="Upload Image"
                                >
                                  <i className="fas fa-upload text-xs"></i>
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <input 
                                  type="text" 
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                  className="w-full bg-transparent font-black text-slate-800 border-none p-0 focus:ring-0 placeholder-slate-300 text-sm uppercase"
                                />
                                <div className="flex gap-2 ml-2">
                                  <button 
                                    onClick={() => handleUpdateItem(item.id, { isSoldOut: !item.isSoldOut })}
                                    className={`text-xs px-2 py-1 rounded-md font-bold transition-all ${item.isSoldOut ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                  >
                                    {item.isSoldOut ? 'Out of Stock' : 'In Stock'}
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    <i className="fas fa-trash-alt text-xs"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="relative mt-1">
                                <textarea 
                                  value={item.description}
                                  onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                                  className="w-full bg-transparent text-xs text-slate-500 border-none p-0 focus:ring-0 resize-none h-12 pr-6"
                                />
                                <button 
                                  onClick={() => handleImproveCopy(item)}
                                  disabled={isImproving === item.id}
                                  className="absolute bottom-1 right-0 text-sky-400 hover:text-sky-600 transition-colors disabled:text-slate-300"
                                  title="AI Mouth-Watering Copy"
                                >
                                  <i className={`fas ${isImproving === item.id ? 'fa-spinner fa-spin' : 'fa-wand-sparkles'} text-xs`}></i>
                                </button>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <input 
                                  type="text" 
                                  value={item.price}
                                  onChange={(e) => handleUpdateItem(item.id, { price: e.target.value })}
                                  className="w-16 bg-transparent font-black text-sky-600 border-none p-0 focus:ring-0 text-sm"
                                />
                                <div className="flex gap-1">
                                  {DIETARY_DATA.map(d => (
                                    <button 
                                      key={d.tag}
                                      onClick={() => toggleDietary(item.id, d.tag)}
                                      className={`w-5 h-5 rounded-full text-[8px] flex items-center justify-center font-black transition-all ${
                                        item.dietary?.includes(d.tag) ? d.color + ' text-white scale-110' : 'bg-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {d.tag}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Deli Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {config.logoUrl ? (
                          <img src={config.logoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                        ) : (
                          <i className="fas fa-image text-slate-300"></i>
                        )}
                      </div>
                      <label className="cursor-pointer bg-white border border-slate-300 px-4 py-2 rounded-lg text-xs font-bold hover:border-sky-500 transition-colors">
                        Upload Logo
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AI Image Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {IMAGE_THEMES.map(theme => (
                        <button
                          key={theme.value}
                          onClick={() => setConfig(prev => ({ ...prev, imageTheme: theme.value }))}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                            config.imageTheme === theme.value 
                              ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <i className={`fas ${theme.icon} ${config.imageTheme === theme.value ? 'text-sky-600' : 'text-slate-400'}`}></i>
                          <span className={`text-[10px] font-black uppercase text-center ${config.imageTheme === theme.value ? 'text-sky-700' : 'text-slate-600'}`}>
                            {theme.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={config.accentColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                          className="w-10 h-10 rounded-lg cursor-pointer border-none p-0"
                        />
                        <span className="text-xs font-mono font-bold text-slate-500 uppercase">{config.accentColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Accent</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={config.secondaryColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-10 h-10 rounded-lg cursor-pointer border-none p-0"
                        />
                        <span className="text-xs font-mono font-bold text-slate-500 uppercase">{config.secondaryColor}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Typography</label>
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      <button 
                        onClick={() => setConfig(prev => ({ ...prev, fontFamily: 'sans' }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${config.fontFamily === 'sans' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Modern Sans
                      </button>
                      <button 
                        onClick={() => setConfig(prev => ({ ...prev, fontFamily: 'serif' }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${config.fontFamily === 'serif' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Classic Serif
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <div className="w-12 h-1 bg-slate-800 rounded-full" />
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-lg shadow-rose-500/20" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-lg shadow-amber-500/20" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-lg shadow-emerald-500/20" />
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">Digital Display Engine v2.0</span>
                <div className="h-4 w-[1px] bg-slate-800" />
                <button 
                  onClick={() => setIsDisplayMode(true)}
                  className="text-sky-500 text-xs font-black flex items-center gap-2 hover:text-sky-400 transition-colors uppercase"
                >
                  <i className="fas fa-expand"></i> Fullscreen
                </button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-[0_0_80px_rgba(0,174,239,0.15)] ring-1 ring-white/5 bg-black">
              <div className="relative w-full aspect-[16/9]">
                <MenuBoard config={config} />
              </div>
            </div>

            <div className="mt-10 flex justify-center gap-12 border-t border-slate-800/50 pt-8">
              <div className="text-center group">
                <p className="text-slate-200 font-black text-lg group-hover:text-sky-400 transition-colors tracking-tight">3840 x 2160</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">4K Native Output</p>
              </div>
              <div className="text-center group">
                <p className="text-slate-200 font-black text-lg group-hover:text-sky-400 transition-colors tracking-tight">16:9 Landscape</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Aspect Ratio</p>
              </div>
              <div className="text-center group">
                <p className="text-slate-200 font-black text-lg group-hover:text-sky-400 transition-colors tracking-tight">60 FPS</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Transition Speed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-6 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white text-xl shadow-lg shadow-sky-500/20">
              <i className="fas fa-lightbulb"></i>
            </div>
            <div>
              <h4 className="font-bold text-sky-900">Pro Tip</h4>
              <p className="text-sky-700 text-sm">Upload a photo of your handwritten chalkboard menu to instantly digitize it with our AI Vision engine!</p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,900&display=swap');
        .font-serif {
          font-family: 'Playfair Display', serif;
        }
      `}</style>
    </div>
  );
};

export default App;
