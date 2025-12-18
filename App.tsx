
import React, { useState, useEffect, useRef } from 'react';
import { MenuConfig, MenuItem, DietaryTag, ThemeDef, SavedMenu, MenuCategory } from './types';
import { DEFAULT_MENU, DIETARY_DATA, DEFAULT_THEMES } from './constants';
import MenuBoard from './components/MenuBoard';
import { generateFoodImage, extractMenuItemsFromImage, improveDescription } from './services/geminiService';
import { encodeMenuConfig, decodeMenuConfig, updateUrlHash } from './sharing';

const MENU_CATEGORIES: MenuCategory[] = [
  'Breakfast', 'Brunch', 'Lunch', 'Happy Hour', 'Dinner', 'Senior Citizen', 'Specials'
];

const App: React.FC = () => {
  const [config, setConfig] = useState<MenuConfig>(DEFAULT_MENU);
  
  // Safe state initialization from localStorage
  const [libraryItems, setLibraryItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('deli_library');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse library", e);
      return [];
    }
  });
  
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>(() => {
    try {
      const saved = localStorage.getItem('deli_saved_boards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse saved boards", e);
      return [];
    }
  });

  const [themes, setThemes] = useState<ThemeDef[]>(() => {
    try {
      const saved = localStorage.getItem('deli_themes');
      return saved ? JSON.parse(saved) : DEFAULT_THEMES;
    } catch (e) {
      return DEFAULT_THEMES;
    }
  });

  const [editingTheme, setEditingTheme] = useState<ThemeDef | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImproving, setIsImproving] = useState<string | null>(null);
  const [isDisplayMode, setIsDisplayMode] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'library'>('content');
  const [librarySubTab, setLibrarySubTab] = useState<'items' | 'menus'>('menus');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  // Modals and UI feedback states
  const [isSavingModalOpen, setIsSavingModalOpen] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<MenuCategory[]>([]);

  // Sync to localStorage with error catching for quota limits
  useEffect(() => {
    try {
      localStorage.setItem('deli_library', JSON.stringify(libraryItems));
    } catch (e) {
      console.warn("Storage quota might be full for library items", e);
    }
  }, [libraryItems]);

  useEffect(() => {
    try {
      localStorage.setItem('deli_saved_boards', JSON.stringify(savedMenus));
    } catch (e) {
      console.warn("Storage quota might be full for saved boards", e);
    }
  }, [savedMenus]);

  useEffect(() => {
    try {
      localStorage.setItem('deli_themes', JSON.stringify(themes));
    } catch (e) {
      console.warn("Storage quota might be full for themes", e);
    }
  }, [themes]);

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
      if (e.key === 'Escape' && isDisplayMode) setIsDisplayMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDisplayMode]);

  const getCurrentThemePrompt = () => {
    const theme = themes.find(t => t.id === config.imageTheme) || DEFAULT_THEMES[0];
    return theme.prompt;
  };

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
    setConfig(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  // Helper to check if an item is already bookmarked in the stock library
  const isItemBookmarked = (item: MenuItem) => {
    return libraryItems.some(libItem => 
      libItem.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
      libItem.description.trim().toLowerCase() === item.description.trim().toLowerCase()
    );
  };

  const handleSaveToLibrary = (item: MenuItem) => {
    // Check if we already have this exact name/description combo
    if (isItemBookmarked(item)) {
        // If already bookmarked, we simply return.
        // User stays on current page. Icon is already yellow.
        return;
    }

    const newItem = { ...item, id: `lib-${Date.now()}` };
    try {
      setLibraryItems(prev => [newItem, ...prev]);
      // Fixed: Removed setActiveTab('library') to stay on board items page
      console.debug("Added to stock library:", newItem.name);
    } catch (e) { 
      alert("Failed to save item to library. This often happens if the image data is too large for browser storage."); 
    }
  };

  const handleAddFromLibrary = (item: MenuItem) => {
    const newItem = { ...item, id: Date.now().toString() };
    setConfig(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setActiveTab('content');
  };

  const handleRemoveFromLibrary = (id: string) => {
    setLibraryItems(prev => prev.filter(item => item.id !== id));
  };

  const openSaveModal = () => {
    setNewMenuName(config.title || 'My Deli Menu');
    setSelectedCategories([]);
    setIsSavingModalOpen(true);
  };

  const handleConfirmSaveMenu = () => {
    if (!newMenuName.trim()) {
      alert("Please enter a name for the menu.");
      return;
    }
    const newSavedMenu: SavedMenu = {
      id: `menu-${Date.now()}`,
      name: newMenuName,
      timestamp: Date.now(),
      config: JSON.parse(JSON.stringify(config)),
      categories: selectedCategories
    };
    try {
      setSavedMenus(prev => [newSavedMenu, ...prev]);
      setIsSavingModalOpen(false);
      setLibrarySubTab('menus');
      setActiveTab('library');
    } catch (e) { 
      alert("Board could not be saved to templates. It may be too large for storage."); 
    }
  };

  const toggleCategory = (cat: MenuCategory) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleLoadMenuTemplate = (saved: SavedMenu) => {
    if (confirm(`Load template "${saved.name}"? This will replace your current board.`)) {
      setConfig(JSON.parse(JSON.stringify(saved.config)));
      setActiveTab('content');
    }
  };

  const handleDeleteMenuTemplate = (id: string) => {
    if (confirm("Permanently delete this template?")) {
      setSavedMenus(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleImproveDescription = async (item: MenuItem) => {
    if (!item.name || item.name === 'New Sandwich') {
      alert("Please give the item a name first so the AI knows what to write about.");
      return;
    }
    setIsImproving(item.id);
    try {
      const improved = await improveDescription(item.name, item.description);
      if (improved) {
        handleUpdateItem(item.id, { description: improved });
      }
    } catch (error) {
      console.error("Failed to improve description", error);
    } finally {
      setIsImproving(null);
    }
  };

  const handleGenerateAllImages = async () => {
    setIsGeneratingAll(true);
    const updatedItems = [...config.items];
    const promptText = getCurrentThemePrompt();
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      if (item.name && item.name !== 'New Sandwich') {
        const imageUrl = await generateFoodImage(item.name, item.description, promptText);
        if (imageUrl) {
          updatedItems[i] = { ...item, imageUrl };
          setConfig(prev => ({ ...prev, items: [...updatedItems] }));
        }
      }
    }
    setIsGeneratingAll(false);
  };

  const handleGenerateSingleItemImage = async (item: MenuItem) => {
    const promptText = getCurrentThemePrompt();
    const imageUrl = await generateFoodImage(item.name, item.description, promptText);
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
      handleUpdateItem(currentUploadId as string, { imageUrl: event.target?.result as string });
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
          const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
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
    } catch (err) { alert("Menu too large to share via URL. Try reducing image sizes."); }
  };

  const handleAddTheme = () => {
    const newTheme: ThemeDef = {
      id: `custom-${Date.now()}`,
      label: 'New Theme',
      icon: 'fa-star',
      prompt: 'Clean professional food photography, natural lighting, high detail.',
      isCustom: true
    };
    setThemes(prev => [...prev, newTheme]);
    setEditingTheme(newTheme);
  };

  const handleUpdateTheme = (id: string, updates: Partial<ThemeDef>) => {
    setThemes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (editingTheme?.id === id) setEditingTheme({ ...editingTheme, ...updates });
  };

  const handleDeleteTheme = (id: string) => {
    if (confirm("Delete this theme?")) {
      setThemes(prev => prev.filter(t => t.id !== id));
      if (config.imageTheme === id) setConfig({ ...config, imageTheme: DEFAULT_THEMES[0].id });
      if (editingTheme?.id === id) setEditingTheme(null);
    }
  };

  if (isHydrating) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white z-[10000]">
        <div className="w-16 h-16 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black uppercase tracking-tight">Initialising Board</h2>
      </div>
    );
  }

  if (isDisplayMode) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center cursor-none">
        <MenuBoard config={config} />
        <button onClick={() => setIsDisplayMode(false)} className="fixed top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full opacity-0 hover:opacity-100 transition-opacity text-xs font-bold">Exit (Esc)</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleItemImageUpload} />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><i className="fas fa-tv text-sm"></i></div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">Deli<span className="text-sky-500">Board</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-white border border-slate-300 hover:border-sky-500 hover:text-sky-600 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
              <i className="fas fa-file-import"></i> {isExtracting ? 'Analyzing...' : 'Import Menu'}
              <input type="file" className="hidden" accept="image/*" onChange={handleMenuImport} disabled={isExtracting} />
            </label>
            <button onClick={handleGenerateAllImages} disabled={isGeneratingAll} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md">
              <i className={`fas ${isGeneratingAll ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i> {isGeneratingAll ? 'Generating...' : 'AI Food Photos'}
            </button>
            <button onClick={handleShareMenu} className={`${isCopying ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-900'} text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md min-w-[160px] justify-center`}>
              <i className={`fas ${isCopying ? 'fa-check' : 'fa-share-nodes'}`}></i> {isCopying ? 'Link & QR Updated!' : 'Update QR & Share'}
            </button>
            <button onClick={() => setIsDisplayMode(true)} className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-md ring-4 ring-sky-500/10">
              <i className="fas fa-play"></i> Launch
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-8 grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[85vh]">
            <div className="flex border-b border-slate-100 flex-shrink-0">
              {['content', 'library', 'design'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/30' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
              {activeTab === 'content' ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deli Name</label>
                    <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none font-bold" />
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800">Board Items</h3>
                      <button onClick={handleAddItem} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-sky-500 hover:text-white flex items-center justify-center"><i className="fas fa-plus"></i></button>
                    </div>
                    <div className="space-y-4">
                      {config.items.map((item) => {
                        const isBookmarked = isItemBookmarked(item);
                        return (
                        <div key={item.id} className={`p-4 border transition-all rounded-xl relative ${item.isSoldOut ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-slate-50 border-slate-200 hover:border-sky-200'}`}>
                          <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 relative group shadow-inner">
                              {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><i className="fas fa-burger text-2xl"></i></div>}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2">
                                <button onClick={() => handleGenerateSingleItemImage(item)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-all"><i className="fas fa-sync-alt text-xs"></i></button>
                                <button onClick={() => triggerItemImageUpload(item.id)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-all"><i className="fas fa-upload text-xs"></i></button>
                              </div>
                            </div>
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <input type="text" value={item.name} onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })} className="w-full bg-transparent font-black text-slate-800 border-none p-0 focus:ring-0 placeholder-slate-300 text-sm uppercase" />
                                <div className="flex gap-1.5 ml-2">
                                  <button 
                                    onClick={() => handleSaveToLibrary(item)} 
                                    className={`${isBookmarked ? 'text-amber-500' : 'text-slate-300'} hover:text-amber-500 transition-colors`} 
                                    title={isBookmarked ? "Already in Item Stock" : "Bookmark for Item Stock"}
                                  >
                                    <i className="fas fa-bookmark text-xs"></i>
                                  </button>
                                  <button onClick={() => handleUpdateItem(item.id, { isSoldOut: !item.isSoldOut })} className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.isSoldOut ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>{item.isSoldOut ? 'Sold' : 'Stock'}</button>
                                  <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-rose-500"><i className="fas fa-trash-alt text-xs"></i></button>
                                </div>
                              </div>
                              <div className="relative group/desc">
                                <textarea 
                                  value={item.description} 
                                  onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })} 
                                  className="w-full bg-transparent text-xs text-slate-500 border-none p-0 focus:ring-0 resize-none h-12 pr-6" 
                                />
                                <button 
                                  onClick={() => handleImproveDescription(item)}
                                  disabled={isImproving === item.id}
                                  className={`absolute right-0 top-0 text-slate-300 hover:text-sky-500 transition-colors p-1 ${isImproving === item.id ? 'animate-pulse text-sky-500' : 'opacity-0 group-hover/desc:opacity-100'}`}
                                  title="AI Improve Description"
                                >
                                  <i className={`fas ${isImproving === item.id ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                                </button>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <input type="text" value={item.price} onChange={(e) => handleUpdateItem(item.id, { price: e.target.value })} className="w-16 bg-transparent font-black text-sky-600 border-none p-0 focus:ring-0 text-sm" />
                                <div className="flex gap-1">
                                  {DIETARY_DATA.map(d => (
                                    <button key={d.tag} onClick={() => toggleDietary(item.id, d.tag)} className={`w-5 h-5 rounded-full text-[8px] flex items-center justify-center font-black ${item.dietary?.includes(d.tag) ? d.color + ' text-white scale-110' : 'bg-slate-200 text-slate-400'}`}>{d.tag}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'library' ? (
                <div className="space-y-6">
                  <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                    <button 
                      onClick={() => setLibrarySubTab('menus')} 
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${librarySubTab === 'menus' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Saved Boards
                    </button>
                    <button 
                      onClick={() => setLibrarySubTab('items')} 
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${librarySubTab === 'items' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Item Stock
                    </button>
                  </div>
                  
                  {librarySubTab === 'menus' ? (
                    <div className="space-y-4">
                      {isSavingModalOpen ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 animate-fade-in shadow-lg">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black uppercase text-emerald-800">Save Current Board</h4>
                            <button onClick={() => setIsSavingModalOpen(false)} className="text-emerald-400 hover:text-emerald-600"><i className="fas fa-times"></i></button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[8px] font-black text-emerald-600 uppercase mb-1">Menu Name</label>
                              <input 
                                type="text" 
                                value={newMenuName} 
                                onChange={(e) => setNewMenuName(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-bold rounded-lg border-emerald-100 border outline-none" 
                                placeholder="e.g. Lunch Specials"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-emerald-600 uppercase mb-2">Classify Menu</label>
                              <div className="flex flex-wrap gap-1.5">
                                {MENU_CATEGORIES.map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase border transition-all ${
                                      selectedCategories.includes(cat)
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white text-emerald-600 border-emerald-100 hover:border-emerald-300'
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={handleConfirmSaveMenu}
                            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md hover:bg-emerald-700 transition-all"
                          >
                            Save Template
                          </button>
                        </div>
                      ) : (
                        <button onClick={openSaveModal} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md"><i className="fas fa-save"></i> Save Current Board</button>
                      )}
                      
                      <div className="pt-2 space-y-3">
                        {savedMenus.length === 0 ? (
                          <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">No saved boards yet</p>
                          </div>
                        ) : (
                          savedMenus.map((menu) => (
                            <div key={menu.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-sky-300 group">
                              <div className="flex justify-between mb-1">
                                <h4 className="text-xs font-black uppercase truncate pr-4">{menu.name}</h4>
                                <button onClick={() => handleDeleteMenuTemplate(menu.id)} className="text-slate-300 hover:text-rose-500"><i className="fas fa-trash-alt text-[10px]"></i></button>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {menu.categories?.map(cat => (
                                  <span key={cat} className="px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded text-[7px] font-bold uppercase">{cat}</span>
                                ))}
                                {(!menu.categories || menu.categories.length === 0) && (
                                  <span className="text-[7px] text-slate-300 font-bold uppercase italic">General</span>
                                )}
                              </div>
                              <button onClick={() => handleLoadMenuTemplate(menu)} className="w-full py-2 bg-slate-50 text-slate-600 hover:bg-sky-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all">Load Layout</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-fade-in">
                      {libraryItems.length === 0 ? (
                        <div className="text-center py-12 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <i className="fas fa-box-open text-slate-200 text-4xl mb-4"></i>
                          <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed">Your Item Stock is empty.<br/>Bookmark items in the "Board" tab to save them here for later use.</p>
                        </div>
                      ) : (
                        libraryItems.map((item) => (
                          <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-sky-300 transition-all">
                            <div className="flex gap-3">
                              <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden shadow-inner">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300"><i className="fas fa-burger"></i></div>
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <h4 className="text-xs font-black uppercase truncate">{item.name}</h4>
                                <p className="text-[9px] text-slate-500 truncate">{item.price}</p>
                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => handleAddFromLibrary(item)} className="bg-sky-500 hover:bg-sky-600 text-white text-[9px] px-2 py-1 rounded font-black uppercase shadow-sm">Add to Board</button>
                                  <button onClick={() => handleRemoveFromLibrary(item.id)} className="text-[9px] text-slate-400 hover:text-rose-500 uppercase font-black transition-colors">Delete</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Deli Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">{config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain p-2" /> : <i className="fas fa-image text-slate-300"></i>}</div>
                      <label className="cursor-pointer bg-white border border-slate-300 px-4 py-2 rounded-lg text-xs font-bold hover:border-sky-500">Upload Logo<input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} /></label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image Themes</label>
                      <button onClick={handleAddTheme} className="text-sky-500 text-[10px] font-black uppercase hover:underline">+ Add Custom</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {themes.map(theme => (
                        <div key={theme.id} className="relative group">
                          <button
                            onClick={() => setConfig({ ...config, imageTheme: theme.id })}
                            className={`w-full flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${config.imageTheme === theme.id ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                          >
                            <i className={`fas ${theme.icon} ${config.imageTheme === theme.id ? 'text-sky-600' : 'text-slate-400'}`}></i>
                            <span className={`text-[9px] font-black uppercase text-center truncate w-full ${config.imageTheme === theme.id ? 'text-sky-700' : 'text-slate-600'}`}>{theme.label}</span>
                          </button>
                          <button 
                            onClick={() => setEditingTheme(theme)}
                            className="absolute top-1 right-1 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 shadow-sm"
                          ><i className="fas fa-edit"></i></button>
                        </div>
                      ))}
                    </div>

                    {editingTheme && (
                      <div className="p-4 bg-slate-100 rounded-2xl space-y-3 relative animate-fade-in shadow-inner">
                        <button onClick={() => setEditingTheme(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                        <h4 className="text-[10px] font-black uppercase text-slate-500">Edit Theme</h4>
                        <div className="space-y-2">
                          <input type="text" value={editingTheme.label} onChange={(e) => handleUpdateTheme(editingTheme.id, { label: e.target.value })} placeholder="Theme Name" className="w-full px-3 py-2 text-xs font-bold rounded-lg border-none" />
                          <input type="text" value={editingTheme.icon} onChange={(e) => handleUpdateTheme(editingTheme.id, { icon: e.target.value })} placeholder="FontAwesome Icon" className="w-full px-3 py-2 text-xs rounded-lg border-none" />
                          <textarea value={editingTheme.prompt} onChange={(e) => handleUpdateTheme(editingTheme.id, { prompt: e.target.value })} placeholder="AI Prompt" className="w-full px-3 py-2 text-[10px] rounded-lg border-none h-24" />
                        </div>
                        {editingTheme.isCustom && (
                          <button onClick={() => handleDeleteTheme(editingTheme.id)} className="w-full py-2 text-rose-500 text-[9px] font-black uppercase hover:bg-rose-50 rounded-lg">Delete Theme</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Accent</label>
                      <input type="color" value={config.accentColor} onChange={(e) => setConfig({ ...config, accentColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Secondary</label>
                      <input type="color" value={config.secondaryColor} onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-rose-500/80" /><div className="w-3 h-3 rounded-full bg-amber-500/80" /><div className="w-3 h-3 rounded-full bg-emerald-500/80" /></div>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">Engine v3.1 - Visual Bookmark Status</span>
                <button onClick={() => setIsDisplayMode(true)} className="text-sky-500 text-xs font-black uppercase hover:text-sky-400 transition-colors"><i className="fas fa-expand"></i> Fullscreen</button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl bg-black border border-white/5 relative aspect-[16/9]"><MenuBoard config={config} /></div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20"><i className="fas fa-check-circle"></i></div>
            <div>
              <h4 className="font-bold text-emerald-900">Live Item Status</h4>
              <p className="text-emerald-700 text-sm">The bookmark icon on your board items now turns <b className="text-amber-600">yellow</b> if an identical item is already saved in your Stock Library.</p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,900&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
