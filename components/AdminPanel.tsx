import React, { useState, useRef } from 'react';
import { Settings, X, Plus, ChevronUp, ChevronDown, Edit2, Trash2, ArrowLeft, Check, Copy, GripVertical, Image as ImageIcon, MapPin, Layers, ArrowUp, ArrowDown, Save, Globe, Clock, Beef, LayoutList, Link, Calendar, Eye, ExternalLink, Zap, Lock, Database, Download, Upload, FileText, FileJson, AlertTriangle, Info, Grid } from 'lucide-react';
import { AppConfig, MenuItem, Outlet, OptionGroup, MenuItemOption, Category, AdPoster } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  outlets: Outlet[];
  setOutlets: (o: Outlet[]) => void;
  onPreviewAd?: (ad: AdPoster) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, config, setConfig, menuItems, setMenuItems, outlets, setOutlets, onPreviewAd }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Main Navigation
  const [mainTab, setMainTab] = useState<'items' | 'optionGroups' | 'settings' | 'system'>('items');
  const [settingsTab, setSettingsTab] = useState<'branding' | 'outlets' | 'ads'>('branding');
  
  // State for Accordions in Items View
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(config.categories.map(c => c.name)));

  // Editing States
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  
  // Category Editing
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  // New Category Editing State (Modal)
  const [editingCategoryData, setEditingCategoryData] = useState<{ originalName: string, name: string, tag: string, tagColor: string } | null>(null);

  // DnD State
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);

  // Bulk Availability Matrix State
  const [showAvailabilityMatrix, setShowAvailabilityMatrix] = useState(false);

  // Confirmation/Alert Modal State
  const [confirmModal, setConfirmModal] = useState<{ title?: string, message: string, action?: () => void, isAlert?: boolean } | null>(null);
  
  // File Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null); // For JSON Backup
  const fileInputCSVRef = useRef<HTMLInputElement>(null); // For CSV Import

  if (!isOpen) return null;

  // --- AUTHENTICATION HANDLER ---
  const handleLogin = () => {
    if (passwordInput === 'Stupiak2019') {
        setIsAuthenticated(true);
        setLoginError(false);
        setPasswordInput('');
    } else {
        setLoginError(true);
        setPasswordInput('');
    }
  };

  const showAlert = (message: string) => {
      setConfirmModal({ title: 'System Message', message, isAlert: true });
  };

  if (!isAuthenticated) {
    return (
        <div className="fixed inset-0 z-[100] bg-brand-black flex flex-col items-center justify-center p-4 animate-in fade-in">
             <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-2 bg-brand-yellow"></div>
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                     <Lock size={32} className="text-brand-black"/>
                 </div>
                 <h2 className="font-display font-bold text-3xl mb-2 uppercase tracking-wide text-brand-black">Admin Access</h2>
                 <p className="text-sm text-gray-500 mb-8 font-medium">Restricted Area. Authorized Personnel Only.</p>
                 
                 <div className="relative">
                    <input 
                        type="password" 
                        className={`w-full border-2 p-4 rounded-xl text-center font-bold outline-none transition-all duration-200 text-lg tracking-widest ${loginError ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-300' : 'border-gray-200 focus:border-brand-yellow focus:ring-4 focus:ring-yellow-50/50'}`}
                        placeholder="ENTER PASSWORD"
                        value={passwordInput}
                        onChange={e => { setPasswordInput(e.target.value); setLoginError(false); }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        autoFocus
                    />
                 </div>
                 
                 {loginError && (
                    <div className="flex items-center justify-center gap-2 text-red-600 mt-4 animate-in slide-in-from-top-2 fade-in">
                        <AlertTriangle size={16} />
                        <span className="text-xs font-bold uppercase">Invalid Credential</span>
                    </div>
                 )}
                 
                 <div className="grid grid-cols-2 gap-3 mt-8">
                     <button onClick={onClose} className="py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                     <button onClick={handleLogin} className="py-3 rounded-xl font-bold bg-brand-black text-brand-yellow hover:bg-gray-800 transition-all active:scale-95 shadow-lg">Unlock System</button>
                 </div>
                 
                 <div className="mt-6 text-[10px] text-gray-300 uppercase tracking-widest font-bold">Stupiak Security System v2.0</div>
             </div>
        </div>
    )
  }

  // --- HELPERS ---
  const toggleCategory = (cat: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(cat)) newSet.delete(cat); else newSet.add(cat);
    setExpandedCategories(newSet);
  };

  const moveItemInArray = <T,>(arr: T[], index: number, direction: 'up' | 'down'): T[] => {
    const newArr = [...arr];
    if (direction === 'up' && index > 0) {
        [newArr[index], newArr[index - 1]] = [newArr[index - 1], newArr[index]];
    } else if (direction === 'down' && index < newArr.length - 1) {
        [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
    }
    return newArr;
  };

  const handleMoveItem = (item: MenuItem, direction: 'up' | 'down') => {
    const itemsInCat = menuItems.filter(i => i.category === item.category);
    const indexInCat = itemsInCat.findIndex(i => i.id === item.id);
    
    if (direction === 'up' && indexInCat > 0) {
        const prevItem = itemsInCat[indexInCat - 1];
        const mainIndex = menuItems.findIndex(i => i.id === item.id);
        const prevMainIndex = menuItems.findIndex(i => i.id === prevItem.id);
        
        const newMenuItems = [...menuItems];
        [newMenuItems[mainIndex], newMenuItems[prevMainIndex]] = [newMenuItems[prevMainIndex], newMenuItems[mainIndex]];
        setMenuItems(newMenuItems);
    } else if (direction === 'down' && indexInCat < itemsInCat.length - 1) {
        const nextItem = itemsInCat[indexInCat + 1];
        const mainIndex = menuItems.findIndex(i => i.id === item.id);
        const nextMainIndex = menuItems.findIndex(i => i.id === nextItem.id);
        
        const newMenuItems = [...menuItems];
        [newMenuItems[mainIndex], newMenuItems[nextMainIndex]] = [newMenuItems[nextMainIndex], newMenuItems[mainIndex]];
        setMenuItems(newMenuItems);
    }
  };

  // --- DRAG AND DROP HANDLERS (CATEGORIES) ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCatIndex(index);
    // Required for Firefox
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === index) return;
    
    const newCats = [...config.categories];
    const [movedCat] = newCats.splice(draggedCatIndex, 1);
    newCats.splice(index, 0, movedCat);
    
    setConfig({ ...config, categories: newCats });
    setDraggedCatIndex(null);
  };

  // --- CATEGORY EDITING ---
  const handleEditCategoryStart = (cat: Category, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCategoryData({
          originalName: cat.name,
          name: cat.name,
          tag: cat.tag || '',
          tagColor: cat.tagColor || '#FFCB05'
      });
  };

  const handleSaveCategoryChanges = () => {
      if (!editingCategoryData) return;
      const { originalName, name, tag, tagColor } = editingCategoryData;

      if (!name.trim()) {
          showAlert("Category name cannot be empty.");
          return;
      }

      let newCats = [...config.categories];
      
      // Update the category in the config list
      newCats = newCats.map(c => c.name === originalName ? { ...c, name, tag, tagColor } : c);
      
      // If name changed, update all associated items and ads
      if (name !== originalName) {
          // Update Items
          setMenuItems(prev => prev.map(i => i.category === originalName ? { ...i, category: name } : i));
          
          // Update Ads
          const newAds = config.adPosters.map(ad => ad.linkToCategory === originalName ? { ...ad, linkToCategory: name } : ad);
          
          setConfig({ ...config, categories: newCats, adPosters: newAds });

          // Update expanded state
          const newExpanded = new Set(expandedCategories);
          if (newExpanded.has(originalName)) {
              newExpanded.delete(originalName);
              newExpanded.add(name);
          }
          setExpandedCategories(newExpanded);
      } else {
          setConfig({ ...config, categories: newCats });
      }

      setEditingCategoryData(null);
  };

  const handleDeleteCategory = (catName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const itemsInCat = menuItems.filter(i => i.category === catName);
      if (itemsInCat.length > 0) {
          showAlert(`Cannot delete category "${catName}" because it contains ${itemsInCat.length} items. Please move or delete items first.`);
          return;
      }
      setConfirmModal({
          message: `Delete category "${catName}"?`,
          action: () => setConfig({ ...config, categories: config.categories.filter(c => c.name !== catName) })
      });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: string, idx?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (target === 'item' && editingItem) setEditingItem({ ...editingItem, imageUrl: res });
        if (target === 'combo' && editingItem) setEditingItem({ ...editingItem, comboImageUrl: res });
        if (target === 'logo') setConfig({ ...config, logoUrl: res });
        if (target === 'hero') setConfig({ ...config, heroImageUrl: res });
        if (target === 'ad' && idx !== undefined) {
             const newAds = [...config.adPosters];
             newAds[idx] = { ...newAds[idx], imageUrl: res };
             setConfig({ ...config, adPosters: newAds });
        }
        if (target === 'option' && editingGroup && idx !== undefined) {
            const newOpts = [...editingGroup.options];
            newOpts[idx].imageUrl = res;
            setEditingGroup({...editingGroup, options: newOpts});
        }
      }
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const saveItem = () => {
      if (!editingItem) return;
      setMenuItems(prev => {
          const idx = prev.findIndex(i => i.id === editingItem.id);
          if (idx >= 0) {
              const newItems = [...prev];
              newItems[idx] = editingItem;
              return newItems;
          }
          return [editingItem, ...prev];
      });
      setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      setConfirmModal({
          message: 'Are you sure you want to delete this item?',
          action: () => {
              setMenuItems(prev => prev.filter(i => i.id !== itemId));
              if(editingItem?.id === itemId) setEditingItem(null);
          }
      });
  };

  const saveGroup = () => {
      if (!editingGroup) return;
      const groups = config.optionGroups || [];
      const idx = groups.findIndex(g => g.id === editingGroup.id);
      let newGroups = [...groups];
      if (idx >= 0) newGroups[idx] = editingGroup;
      else newGroups.push(editingGroup);
      
      setConfig({ ...config, optionGroups: newGroups });
      setEditingGroup(null);
  };

  const toggleGroupLink = (groupId: string) => {
      if (!editingItem) return;
      const currentLinks = editingItem.linkedOptionGroupIds || [];
      if (currentLinks.includes(groupId)) {
          setEditingItem({ ...editingItem, linkedOptionGroupIds: currentLinks.filter(id => id !== groupId) });
      } else {
          setEditingItem({ ...editingItem, linkedOptionGroupIds: [...currentLinks, groupId] });
      }
  };

  const moveLinkedGroup = (index: number, direction: 'up' | 'down') => {
      if (!editingItem || !editingItem.linkedOptionGroupIds) return;
      const newLinks = moveItemInArray(editingItem.linkedOptionGroupIds, index, direction);
      setEditingItem({ ...editingItem, linkedOptionGroupIds: newLinks });
  };
  
  const handleDuplicateItem = (item: MenuItem, e: React.MouseEvent) => {
      e.stopPropagation();
      const newItem: MenuItem = {
          ...item,
          id: `new-${Date.now()}`,
          name: `${item.name} (Copy)`,
          linkedOptionGroupIds: item.linkedOptionGroupIds ? [...item.linkedOptionGroupIds] : [],
          options: item.options ? [...item.options] : [],
      };
      const idx = menuItems.findIndex(i => i.id === item.id);
      const newMenuItems = [...menuItems];
      newMenuItems.splice(idx + 1, 0, newItem);
      setMenuItems(newMenuItems);
  };
  
  const handleDuplicateGroup = (group: OptionGroup, e: React.MouseEvent) => {
      e.stopPropagation();
      const newGroup: OptionGroup = {
          ...group,
          id: `og-${Date.now()}`,
          name: `${group.name} (Copy)`,
          options: group.options.map(o => ({...o})),
      };
      setConfig(prev => ({...prev, optionGroups: [...(prev.optionGroups || []), newGroup]}));
  };

  // --- SYSTEM FUNCTIONS ---
  const handleExportBackup = () => {
      const backupData = {
          timestamp: new Date().toISOString(),
          version: "2.0",
          config: config,
          menuItems: menuItems,
          outlets: outlets
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stupiak_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
      // Define CSV Headers
      const headers = ["ID", "Name", "Category", "Price", "Combo Price", "Meat Type", "Description", "Is Hidden", "Schedule"];
      
      // Map Items to CSV Rows
      const rows = menuItems.map(item => [
          item.id,
          `"${item.name.replace(/"/g, '""')}"`, // Escape quotes
          `"${item.category}"`,
          item.price.toFixed(2),
          item.comboPrice ? item.comboPrice.toFixed(2) : "",
          item.meatType,
          `"${item.description.replace(/"/g, '""')}"`,
          item.isHidden ? "TRUE" : "FALSE",
          item.availabilitySchedule || ""
      ].join(","));
      
      const csvContent = [headers.join(","), ...rows].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stupiak_Menu_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleImportBackupTrigger = () => {
      fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.config && json.menuItems && json.outlets) {
                  setConfirmModal({
                      message: `Restore system from backup dated ${json.timestamp || 'Unknown'}? This will overwrite current data.`,
                      action: () => {
                          setConfig(json.config);
                          setMenuItems(json.menuItems);
                          setOutlets(json.outlets);
                          showAlert("System Restored Successfully!");
                      }
                  });
              } else {
                  showAlert("Invalid backup file format.");
              }
          } catch (err) {
              showAlert("Error parsing backup file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = ''; 
  };

  // --- CSV IMPORT LOGIC ---
  const handleImportCSVTrigger = () => {
      fileInputCSVRef.current?.click();
  };

  const parseCSV = (text: string) => {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;
  
      for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];
  
          if (char === '"') {
              if (inQuotes && nextChar === '"') {
                  currentCell += '"';
                  i++; // skip next quote
              } else {
                  inQuotes = !inQuotes;
              }
          } else if (char === ',' && !inQuotes) {
              currentRow.push(currentCell);
              currentCell = '';
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
              if (char === '\r' && nextChar === '\n') i++;
              currentRow.push(currentCell);
              rows.push(currentRow);
              currentRow = [];
              currentCell = '';
          } else {
              currentCell += char;
          }
      }
      if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell);
          rows.push(currentRow);
      }
      return rows;
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const csvText = event.target?.result as string;
          const rows = parseCSV(csvText);

          // Find Header Row (look for ItemID, allowing for BOM and extra chars)
          const headerRowIdx = rows.findIndex(row => row.some(cell => {
              const cleaned = cell.replace(/[\ufeff"*]/g, '').trim();
              return cleaned === 'ItemID' || cleaned === 'Item ID';
          }));
          
          if (headerRowIdx === -1) {
              showAlert("Invalid CSV Format: Could not find 'ItemID' header row.");
              return;
          }

          // Clean headers to be key-friendly
          const headers = rows[headerRowIdx].map(h => h.replace(/[\ufeff"*\s]+/g, '').trim()); 
          
          // Map header names to indices
          const getIdx = (name: string) => headers.findIndex(h => h.includes(name));
          
          const idxID = getIdx('ItemID');
          const idxName = getIdx('ItemName');
          const idxPrice = getIdx('Price');
          const idxCat = getIdx('CategoryName');
          const idxDesc = getIdx('Description');
          const idxStatus = getIdx('AvailableStatus');
          const idxSchedule = getIdx('AvailabilitySchedule');
          const idxPhoto = getIdx('Photo1');
          
          // Identify Option Group Columns
          const optionGroupIndices = headers.map((h, i) => h.includes('OptionGroup') ? i : -1).filter(i => i !== -1);

          let newMenuItems = [...menuItems];
          let newConfig = { ...config };
          let importedCount = 0;

          // Process Data Rows
          for (let i = headerRowIdx + 1; i < rows.length; i++) {
              const row = rows[i];
              if (row.length < 5) continue; // Skip empty/malformed rows

              const id = row[idxID]?.trim();
              const name = row[idxName]?.trim();
              const priceStr = row[idxPrice]?.trim();
              
              if (!id || !name || !priceStr || isNaN(parseFloat(priceStr))) continue; // Skip invalid data

              const price = parseFloat(priceStr);
              const category = row[idxCat]?.trim() || 'Uncategorized';
              const description = row[idxDesc]?.trim() || '';
              const statusStr = row[idxStatus]?.trim();
              const isHidden = statusStr !== 'AVAILABLE';
              const schedule = row[idxSchedule]?.trim() || '';
              const imageUrl = row[idxPhoto]?.trim() || '';

              // 1. Upsert Category
              if (!newConfig.categories.some(c => c.name === category)) {
                  newConfig.categories.push({ name: category });
              }

              // 2. Process Option Groups
              const linkedGroupIds: string[] = [];
              
              optionGroupIndices.forEach(colIdx => {
                  const rawString = row[colIdx]?.trim();
                  // Format: Name##MinSelection-MaxSelection##OptionName1:Price#OptionName2:Price
                  if (rawString) {
                      const parts = rawString.split('##');
                      if (parts.length >= 3) {
                          const groupName = parts[0];
                          const limits = parts[1].split('-');
                          const minSel = parseInt(limits[0] || '0');
                          const maxSel = parseInt(limits[1] || '0');
                          const optionsStr = parts[2];

                          const options: MenuItemOption[] = optionsStr.split('#').map(optStr => {
                              const lastColon = optStr.lastIndexOf(':');
                              if (lastColon === -1) return null;
                              return {
                                  name: optStr.substring(0, lastColon).trim(),
                                  price: parseFloat(optStr.substring(lastColon + 1)) || 0,
                                  type: 'addon'
                              };
                          }).filter(o => o !== null) as MenuItemOption[];

                          // Check if Group Exists
                          let existingGroup = newConfig.optionGroups?.find(g => g.name === groupName);
                          
                          if (existingGroup) {
                              existingGroup.options = options;
                              existingGroup.maxSelection = maxSel;
                              existingGroup.isRequired = minSel > 0;
                              linkedGroupIds.push(existingGroup.id);
                          } else {
                              // Create New Group
                              const newGroup: OptionGroup = {
                                  id: `og-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                  name: groupName,
                                  maxSelection: maxSel,
                                  isRequired: minSel > 0,
                                  options: options,
                                  displayMode: 'both' // Default
                              };
                              if(!newConfig.optionGroups) newConfig.optionGroups = [];
                              newConfig.optionGroups.push(newGroup);
                              linkedGroupIds.push(newGroup.id);
                          }
                      }
                  }
              });

              // 3. Upsert Menu Item
              const existingItemIndex = newMenuItems.findIndex(item => item.id === id);
              const newItem: MenuItem = {
                  id,
                  name,
                  price,
                  category,
                  description,
                  imageUrl: imageUrl || (existingItemIndex >= 0 ? newMenuItems[existingItemIndex].imageUrl : ''), // Keep existing image if CSV blank
                  isHidden,
                  meatType: existingItemIndex >= 0 ? newMenuItems[existingItemIndex].meatType : 'All', // Preserve meat type or default
                  linkedOptionGroupIds: linkedGroupIds,
                  availabilitySchedule: schedule, // Map Schedule
                  // Preserve other fields
                  comboPrice: existingItemIndex >= 0 ? newMenuItems[existingItemIndex].comboPrice : undefined,
                  comboImageUrl: existingItemIndex >= 0 ? newMenuItems[existingItemIndex].comboImageUrl : undefined
              };

              if (existingItemIndex >= 0) {
                  newMenuItems[existingItemIndex] = newItem;
              } else {
                  newMenuItems.push(newItem);
              }
              importedCount++;
          }

          setConfirmModal({
              title: "Import Success",
              message: `Successfully processed CSV. Updated/Added ${importedCount} items. Save changes?`,
              action: () => {
                  setConfig(newConfig);
                  setMenuItems(newMenuItems);
                  showAlert("Menu Import Complete!");
              }
          });
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  // --- RENDERERS ---

  // ... (Items View, Groups View, System View remain mostly the same, ensuring System View uses new Modal) ...

  // 1. ITEMS LIST VIEW
  const renderItemsView = () => (
      <div className="pb-20">
          <div className="flex justify-between items-center mb-4">
              <div className="bg-yellow-50 p-2 px-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 flex gap-2 flex-1 mr-4">
                 <Layers size={16} className="shrink-0 mt-0.5"/>
                 <div className="text-xs">
                    Drag and drop categories to reorder them.
                 </div>
              </div>
              <button 
                  onClick={() => setShowAvailabilityMatrix(true)}
                  className="bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-50 shadow-sm"
              >
                  <Grid size={16}/> Bulk Availability
              </button>
          </div>

          {config.categories.map((cat, index) => (
              <div 
                  key={cat.name} 
                  className={`bg-white mb-4 shadow-sm border-b border-gray-100 last:border-0 rounded-lg overflow-hidden transition-opacity ${draggedCatIndex === index ? 'opacity-50 ring-2 ring-brand-yellow' : 'opacity-100'}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
              >
                  <div 
                      onClick={() => toggleCategory(cat.name)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-gray-50/50"
                  >
                      <div className="flex items-center gap-2 flex-1">
                          <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-black">
                             <GripVertical size={18}/>
                          </div>
                          <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg text-brand-black">{cat.name}</h3>
                              {cat.tag && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide" style={{backgroundColor: cat.tagColor || '#FFCB05', color: '#000'}}>
                                      {cat.tag}
                                  </span>
                              )}
                              <button onClick={(e) => handleEditCategoryStart(cat, e)} className="p-1 text-gray-400 hover:text-brand-black"><Edit2 size={14}/></button>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <button onClick={(e) => handleDeleteCategory(cat.name, e)} className="p-1 text-gray-400 hover:text-red-500 mr-2"><Trash2 size={16}/></button>

                          {expandedCategories.has(cat.name) ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
                      </div>
                  </div>
                  
                  {expandedCategories.has(cat.name) && (
                      <div>
                          {menuItems.filter(i => i.category === cat.name).map((item, iIdx, arr) => (
                              <div key={item.id} className="flex items-center justify-between p-4 border-t border-gray-100 bg-white group hover:bg-gray-50">
                                  <div className="flex items-center gap-2 mr-2">
                                      <div className="flex flex-col gap-1">
                                          <button disabled={iIdx === 0} onClick={() => handleMoveItem(item, 'up')} className="text-gray-300 hover:text-black disabled:opacity-0"><ArrowUp size={14}/></button>
                                          <button disabled={iIdx === arr.length - 1} onClick={() => handleMoveItem(item, 'down')} className="text-gray-300 hover:text-black disabled:opacity-0"><ArrowDown size={14}/></button>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                                      <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200" />
                                      <div>
                                          <div className="font-bold text-brand-black text-sm">{item.name}</div>
                                          <div className="text-gray-500 text-xs">{config.currencySymbol} {item.price.toFixed(2)}</div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                       <button onClick={(e) => handleDuplicateItem(item, e)} className="p-2 text-gray-400 hover:text-black" title="Duplicate Item"><Copy size={16}/></button>
                                       <button onClick={(e) => handleDeleteItem(item.id, e)} className="p-2 text-gray-400 hover:text-red-600" title="Delete Item"><Trash2 size={16}/></button>
                                       <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" className="sr-only peer" checked={!item.isHidden} 
                                            onChange={() => {
                                                setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, isHidden: !i.isHidden } : i));
                                            }} 
                                          />
                                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                      </label>
                                  </div>
                              </div>
                          ))}
                          {menuItems.filter(i => i.category === cat.name).length === 0 && (
                              <div className="p-4 text-center text-gray-400 text-sm italic">No items in this category</div>
                          )}
                          <div className="p-2 border-t border-gray-100">
                             <button onClick={() => setEditingItem({ 
                                  id: `new-${Date.now()}`, 
                                  name: '', price: 0, description: '', category: cat.name, meatType: 'All', 
                                  imageUrl: 'https://placehold.co/150', linkedOptionGroupIds: [], 
                                  isHidden: true, // Default hidden
                                  availableDelivery: true, availablePickup: true, availableDineIn: true 
                              })} className="w-full py-2 text-green-600 font-bold text-sm hover:bg-green-50 rounded flex items-center justify-center gap-2">
                                  <Plus size={16}/> Add item to {cat.name}
                             </button>
                          </div>
                      </div>
                  )}
              </div>
          ))}

          <div className="fixed bottom-6 right-6 flex flex-col gap-3">
              <button 
                  onClick={() => setShowAddCatModal(true)}
                  className="bg-brand-black text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition-transform hover:scale-105"
              >
                  <Plus size={20}/> Add Category
              </button>
          </div>
      </div>
  );

  // 2. OPTION GROUPS LIST VIEW
  const renderGroupsView = () => (
      <div className="p-4 pb-20 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
             Option Groups allow customers to modify their order, like choosing a size, spiciness level, or toppings.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                  onClick={() => setEditingGroup({ id: `og-${Date.now()}`, name: '', options: [], displayMode: 'both' })}
                  className="h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-brand-black hover:text-brand-black hover:bg-gray-50 transition-all"
              >
                  <div className="bg-gray-200 p-3 rounded-full mb-2"><Plus size={24}/></div>
                  <span className="font-bold">Create New Group</span>
              </button>

              {config.optionGroups?.map(group => (
                  <div key={group.id} onClick={() => setEditingGroup(group)} className="h-40 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer flex flex-col relative group">
                      <div className="flex-1">
                          <h4 className="font-bold text-lg text-brand-black line-clamp-2">{group.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">{group.options.length} opts</span>
                              {group.displayMode === 'combo' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Combo Only</span>}
                              {group.displayMode === 'alaCarte' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Ala Carte Only</span>}
                              {group.isCustomization && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold">Ingredients</span>}
                              {group.allowQuantity && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Qty Allowed</span>}
                          </div>
                      </div>
                      <div className="mt-auto flex justify-end">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">Edit</span>
                      </div>
                      <button 
                         onClick={(e) => handleDuplicateGroup(group, e)}
                         className="absolute top-2 right-10 p-2 text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Duplicate Group"
                      >
                         <Copy size={16}/>
                      </button>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                                message: 'Delete this group?',
                                action: () => setConfig({...config, optionGroups: config.optionGroups.filter(g => g.id !== group.id)})
                            });
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                          <Trash2 size={16}/>
                      </button>
                  </div>
              ))}
          </div>
      </div>
  );

  // 3. SYSTEM VIEW (Backup & Restore)
  const renderSystemView = () => (
      <div className="p-4 space-y-6">
          <div className="bg-brand-black text-white p-6 rounded-2xl shadow-xl flex items-center justify-between">
              <div>
                  <h3 className="font-display font-bold text-2xl uppercase tracking-wide">System Control</h3>
                  <p className="text-gray-400 text-sm mt-1">Manage data, backups, and exports.</p>
              </div>
              <div className="bg-white/10 p-3 rounded-full">
                  <Database size={32} />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BACKUP SECTION */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                   <div className="flex items-center gap-3 mb-2">
                       <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Download size={24}/></div>
                       <div>
                           <h4 className="font-bold text-lg text-brand-black">Full System Backup</h4>
                           <p className="text-xs text-gray-500">Save complete configuration to JSON</p>
                       </div>
                   </div>
                   <p className="text-sm text-gray-600 leading-relaxed">
                       Downloads a <code>.json</code> file containing all categories, menu items, option groups, outlets, and branding settings. Use this to save your work or migrate to another device.
                   </p>
                   <button onClick={handleExportBackup} className="w-full py-3 bg-brand-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                       <FileJson size={16}/> Download Backup
                   </button>
              </div>

              {/* RESTORE SECTION */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                   <div className="flex items-center gap-3 mb-2">
                       <div className="bg-green-100 p-2 rounded-lg text-green-600"><Upload size={24}/></div>
                       <div>
                           <h4 className="font-bold text-lg text-brand-black">Restore System</h4>
                           <p className="text-xs text-gray-500">Load configuration from backup</p>
                       </div>
                   </div>
                   <p className="text-sm text-gray-600 leading-relaxed">
                       Upload a previously saved backup file. <strong className="text-red-500">Warning:</strong> This will completely overwrite all current menu items and settings.
                   </p>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json"
                      onChange={handleImportFile}
                   />
                   <button onClick={handleImportBackupTrigger} className="w-full py-3 bg-white border-2 border-gray-200 text-brand-black rounded-lg font-bold text-sm hover:border-brand-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                       <Upload size={16}/> Select Backup File
                   </button>
              </div>

               {/* IMPORT/EXPORT CSV SECTION */}
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 md:col-span-2">
                   <div className="flex items-center gap-3 mb-2">
                       <div className="bg-yellow-100 p-2 rounded-lg text-yellow-700"><FileText size={24}/></div>
                       <div>
                           <h4 className="font-bold text-lg text-brand-black">Menu CSV Operations</h4>
                           <p className="text-xs text-gray-500">Import/Export menu data (Excel compatible)</p>
                       </div>
                   </div>
                   <div className="flex items-center justify-between gap-4">
                       <p className="text-sm text-gray-600 leading-relaxed flex-1">
                           <strong>Export:</strong> Download current menu as CSV.<br/>
                           <strong>Import:</strong> Upload GrabFood style CSV to update menu. Existing items (by ID) will be updated, new items created.
                       </p>
                       <div className="flex gap-2">
                           <button onClick={handleExportCSV} className="px-6 py-3 bg-gray-100 text-brand-black rounded-lg font-bold text-sm hover:bg-brand-yellow transition-all flex items-center gap-2">
                               <Download size={16}/> Export CSV
                           </button>
                           <input 
                              type="file" 
                              ref={fileInputCSVRef} 
                              className="hidden" 
                              accept=".csv"
                              onChange={handleImportCSVFile}
                           />
                           <button onClick={handleImportCSVTrigger} className="px-6 py-3 bg-brand-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all flex items-center gap-2">
                               <Upload size={16}/> Import CSV
                           </button>
                       </div>
                   </div>
              </div>
          </div>
      </div>
  );

  // 4. BULK AVAILABILITY MATRIX (Modal)
  const renderAvailabilityMatrix = () => (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAvailabilityMatrix(false)}/>
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b flex justify-between items-center bg-white z-10">
                  <h3 className="font-bold text-xl text-brand-black">Bulk Availability Assignment</h3>
                  <button onClick={() => setShowAvailabilityMatrix(false)}><X className="text-gray-500 hover:text-black"/></button>
              </div>
              <div className="flex-1 overflow-auto p-4 relative">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 sticky top-0 z-40 shadow-sm">
                          <tr>
                              <th className="p-3 border sticky left-0 z-50 bg-gray-100 w-[200px] min-w-[200px] text-brand-black shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Item Name</th>
                              <th className="p-3 border sticky left-[200px] z-50 bg-gray-100 w-[150px] min-w-[150px] text-brand-black shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Category</th>
                              <th className="p-3 border text-center w-24 font-bold bg-white text-brand-black">Available Everywhere?</th>
                              {outlets.map(outlet => (
                                  <th key={outlet.id} className="p-3 border text-center w-32 text-brand-black">{outlet.name}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody>
                          {menuItems.map(item => {
                              const isUniversal = !item.availabilityOutlets || item.availabilityOutlets.length === 0;
                              return (
                                  <tr key={item.id} className="border-b hover:bg-gray-50">
                                      <td className="p-3 border font-medium sticky left-0 z-30 bg-white text-brand-black shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item.name}</td>
                                      <td className="p-3 border sticky left-[200px] z-30 bg-white text-brand-black shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item.category}</td>
                                      <td className="p-3 border text-center text-brand-black">
                                          <input 
                                              type="checkbox" 
                                              checked={isUniversal}
                                              onChange={() => {
                                                  // Toggle between empty (all) and specific (none)
                                                  const newItems = menuItems.map(i => {
                                                      if(i.id === item.id) {
                                                          return { ...i, availabilityOutlets: isUniversal ? ['__none__'] : [] };
                                                      }
                                                      return i;
                                                  });
                                                  setMenuItems(newItems);
                                              }}
                                              className="w-5 h-5 rounded cursor-pointer"
                                          />
                                      </td>
                                      {outlets.map(outlet => {
                                          const isAvailable = isUniversal || item.availabilityOutlets?.includes(outlet.id);
                                          return (
                                              <td key={outlet.id} className="p-3 border text-center text-brand-black">
                                                  <input 
                                                      type="checkbox"
                                                      checked={!!isAvailable}
                                                      disabled={isUniversal}
                                                      onChange={() => {
                                                          const currentOutlets = item.availabilityOutlets || [];
                                                          let newOutlets = [...currentOutlets];
                                                          if (newOutlets.includes(outlet.id)) {
                                                              newOutlets = newOutlets.filter(id => id !== outlet.id);
                                                          } else {
                                                              newOutlets.push(outlet.id);
                                                          }
                                                          
                                                          const updatedItems = menuItems.map(i => {
                                                              if(i.id === item.id) {
                                                                  return { ...i, availabilityOutlets: newOutlets };
                                                              }
                                                              return i;
                                                          });
                                                          setMenuItems(updatedItems);
                                                      }}
                                                      className="w-5 h-5 rounded cursor-pointer disabled:opacity-30"
                                                  />
                                              </td>
                                          )
                                      })}
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
              <div className="p-4 border-t bg-gray-50 text-right">
                  <button onClick={() => setShowAvailabilityMatrix(false)} className="bg-brand-black text-white px-6 py-2 rounded-lg font-bold">Done</button>
              </div>
          </div>
      </div>
  );

  // 5. CATEGORY EDITOR (Modal)
  const renderCategoryEditor = () => {
    if (!editingCategoryData) return null;
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 border border-gray-200">
                  <h3 className="font-bold text-lg mb-4 text-black">Edit Category</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Category Name</label>
                          <input 
                              className="w-full border border-gray-300 bg-white p-3 rounded-lg text-black outline-none focus:border-black font-bold" 
                              value={editingCategoryData.name}
                              onChange={e => setEditingCategoryData({...editingCategoryData, name: e.target.value})}
                              autoFocus
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Tag Text</label>
                              <input 
                                  className="w-full border border-gray-300 bg-white p-3 rounded-lg text-black outline-none focus:border-black text-xs" 
                                  placeholder="e.g. New"
                                  value={editingCategoryData.tag}
                                  onChange={e => setEditingCategoryData({...editingCategoryData, tag: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Tag Color</label>
                              <div className="flex items-center gap-2 h-[42px] border border-gray-300 rounded-lg px-2 bg-white">
                                  <input 
                                      type="color" 
                                      className="w-8 h-8 rounded border-none cursor-pointer"
                                      value={editingCategoryData.tagColor}
                                      onChange={e => setEditingCategoryData({...editingCategoryData, tagColor: e.target.value})}
                                  />
                                  <span className="text-xs text-gray-500">{editingCategoryData.tagColor}</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setEditingCategoryData(null)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={handleSaveCategoryChanges} className="px-6 py-2 bg-brand-black text-white font-bold rounded-lg hover:bg-gray-800">Save Changes</button>
                  </div>
             </div>
        </div>
    )
  };

  // 6. ITEM EDITOR (Modal)
  const renderItemEditor = () => {
    if (!editingItem) return null;
    return (
      <div className="fixed inset-0 z-[120] flex justify-end">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
        <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b flex justify-between items-center bg-white z-10">
            <button onClick={() => setEditingItem(null)}><X className="text-gray-500" /></button>
            <h3 className="font-bold text-lg">Edit Item</h3>
            <button onClick={saveItem} className="text-green-600 font-bold text-sm">Save</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-white rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group shrink-0">
                {editingItem.imageUrl ? <img src={editingItem.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" />}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-xs font-bold transition-opacity">Upload</div>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={e => handleImageUpload(e, 'item')} />
              </div>
              <div className="flex-1 space-y-3">
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 font-bold text-lg outline-none focus:border-green-500 bg-white text-black"
                  placeholder="Item Name"
                  value={editingItem.name}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                />
                <div className="flex gap-2">
                  <div className="flex items-center border border-gray-300 rounded-lg bg-white px-3 w-1/2">
                    <span className="text-gray-500 text-sm font-bold mr-1">{config.currencySymbol}</span>
                    <input
                      type="number"
                      className="w-full py-2 outline-none font-bold text-black bg-transparent"
                      placeholder="Price"
                      value={editingItem.price}
                      onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <select
                    className="w-1/2 border border-gray-300 rounded-lg bg-white px-2 text-sm text-black"
                    value={editingItem.category}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                  >
                    {config.categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white text-black focus:border-green-500 outline-none"
                rows={3}
                placeholder="Describe the deliciousness..."
                value={editingItem.description}
                onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Meat Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white text-black"
                  value={editingItem.meatType}
                  onChange={e => setEditingItem({ ...editingItem, meatType: e.target.value })}
                >
                  <option value="All">All / None</option>
                  {config.meatCategories.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Availability</label>
                <div className="flex gap-2">
                   <label className="flex items-center gap-1 text-xs cursor-pointer bg-white border border-gray-200 p-2 rounded flex-1 justify-center">
                      <input type="checkbox" checked={!editingItem.isHidden} onChange={() => setEditingItem({...editingItem, isHidden: !editingItem.isHidden})}/>
                      Visible
                   </label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
               <h4 className="font-bold text-gray-900">Combo Settings</h4>
               <div className="flex gap-4 items-start">
                   <div className="w-20 h-20 bg-white rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group shrink-0">
                      {editingItem.comboImageUrl ? <img src={editingItem.comboImageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" />}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold transition-opacity text-center px-1">Upload Combo</div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={e => handleImageUpload(e, 'combo')} />
                   </div>
                   <div className="flex-1">
                       <label className="block text-xs font-bold text-gray-500 mb-1">Combo Price Override</label>
                       <div className="flex items-center border border-gray-300 rounded-lg bg-white px-3">
                          <span className="text-gray-500 text-sm font-bold mr-1">{config.currencySymbol}</span>
                          <input
                            type="number"
                            className="w-full py-2 outline-none font-bold text-black bg-transparent"
                            placeholder="Same as regular"
                            value={editingItem.comboPrice || ''}
                            onChange={e => setEditingItem({ ...editingItem, comboPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                          />
                       </div>
                       <p className="text-[10px] text-gray-400 mt-1">If set, this price is used when item is part of a combo flow.</p>
                   </div>
               </div>
            </div>

            <div className="border-t pt-4 space-y-4">
               <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900">Linked Option Groups</h4>
                  <span className="text-xs text-gray-400">Flow Order</span>
               </div>
               
               <div className="space-y-2">
                   {editingItem.linkedOptionGroupIds?.map((gid, idx) => {
                       const group = config.optionGroups?.find(g => g.id === gid);
                       if(!group) return null;
                       return (
                           <div key={gid} className="flex items-center justify-between p-3 bg-white border border-brand-black rounded-lg shadow-sm">
                               <div className="flex items-center gap-2">
                                   <div className="bg-brand-black text-brand-yellow w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                   <span className="font-bold text-sm text-black">{group.name}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                    <button disabled={idx === 0} onClick={() => moveLinkedGroup(idx, 'up')} className="text-gray-400 hover:text-black disabled:opacity-20"><ArrowUp size={14}/></button>
                                    <button disabled={idx === (editingItem.linkedOptionGroupIds?.length || 0) - 1} onClick={() => moveLinkedGroup(idx, 'down')} className="text-gray-400 hover:text-black disabled:opacity-20"><ArrowDown size={14}/></button>
                                    <button onClick={() => toggleGroupLink(gid)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                               </div>
                           </div>
                       )
                   })}
                   {(!editingItem.linkedOptionGroupIds || editingItem.linkedOptionGroupIds.length === 0) && (
                       <div className="text-center py-4 text-gray-400 text-xs italic bg-gray-50 rounded border border-dashed border-gray-200">
                           No groups linked. Item will just be added to cart directly.
                       </div>
                   )}
               </div>

               <div className="pt-4">
                   <label className="block text-xs font-bold text-gray-500 mb-2">Add Option Group</label>
                   <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                       {config.optionGroups?.filter(g => !editingItem.linkedOptionGroupIds?.includes(g.id)).map(group => (
                           <button 
                             key={group.id} 
                             onClick={() => toggleGroupLink(group.id)}
                             className="flex items-center justify-between p-2 rounded border border-gray-200 bg-white hover:border-brand-yellow hover:bg-yellow-50 text-left group"
                           >
                               <span className="text-sm font-medium text-gray-700">{group.name}</span>
                               <Plus size={14} className="text-gray-300 group-hover:text-brand-black"/>
                           </button>
                       ))}
                       {config.optionGroups?.length === 0 && <div className="text-xs text-gray-400">No option groups created yet. Go to Option Groups tab.</div>}
                   </div>
               </div>
            </div>

            <div className="border-t pt-4 space-y-4">
                 <h4 className="font-bold text-gray-900">Tags & Visuals</h4>
                 <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Tag Text</label>
                          <input 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-black"
                            placeholder="e.g. New, Hot"
                            value={editingItem.tag || ''}
                            onChange={e => setEditingItem({ ...editingItem, tag: e.target.value })}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Tag Color</label>
                          <div className="flex items-center gap-2">
                              <input 
                                type="color"
                                className="w-8 h-8 rounded overflow-hidden border-0 p-0 cursor-pointer"
                                value={editingItem.tagColor || '#FFCB05'}
                                onChange={e => setEditingItem({ ...editingItem, tagColor: e.target.value })}
                              />
                              <span className="text-xs text-gray-500">{editingItem.tagColor}</span>
                          </div>
                      </div>
                 </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // 7. GROUP EDITOR (Modal)
  const renderGroupEditor = () => {
      if (!editingGroup) return null;
      return (
          <div className="fixed inset-0 z-[120] flex justify-end">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setEditingGroup(null)}/>
              <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
                  <div className="p-4 border-b flex justify-between items-center bg-white z-10">
                      <button onClick={() => setEditingGroup(null)}><X className="text-gray-500"/></button>
                      <h3 className="font-bold text-lg">Edit Option Group</h3>
                      <button onClick={saveGroup} className="text-green-600 font-bold text-sm">Save</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Group Name *</label>
                              <input 
                                className="w-full border border-gray-300 rounded-lg p-3 focus:border-green-500 outline-none font-bold text-lg bg-white text-black shadow-sm" 
                                placeholder="e.g. Size, Toppings" 
                                value={editingGroup.name} 
                                onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} 
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Selection Logic</label>
                              <select 
                                  className="w-full border border-gray-300 p-2 rounded-lg bg-white text-sm text-black"
                                  value={editingGroup.isRequired ? 'required' : 'optional'}
                                  onChange={(e) => setEditingGroup({...editingGroup, isRequired: e.target.value === 'required'})}
                              >
                                  <option value="required">Required (Must select)</option>
                                  <option value="optional">Optional</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Max Selection</label>
                              <input 
                                  type="number"
                                  className="w-full border border-gray-300 p-2 rounded-lg bg-white text-sm text-black"
                                  value={editingGroup.maxSelection || 0}
                                  onChange={(e) => setEditingGroup({...editingGroup, maxSelection: parseInt(e.target.value)})}
                                  placeholder="0 for unlimited"
                              />
                              <div className="text-[10px] text-gray-400 mt-1">1 = Single Choice, 0 = Unlimited</div>
                          </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={editingGroup.isCustomization}
                                  onChange={(e) => setEditingGroup({...editingGroup, isCustomization: e.target.checked})}
                                  className="rounded text-brand-black focus:ring-black"
                              />
                              <span className="text-sm font-bold text-gray-700">Is Ingredient Customization?</span>
                          </label>
                          <p className="text-xs text-gray-500 pl-6">If checked, this group appears in the "Customize" modal instead of the main flow.</p>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={editingGroup.allowQuantity}
                                  onChange={(e) => setEditingGroup({...editingGroup, allowQuantity: e.target.checked})}
                                  className="rounded text-brand-black focus:ring-black"
                              />
                              <span className="text-sm font-bold text-gray-700">Allow Quantity per Option?</span>
                          </label>
                          <p className="text-xs text-gray-500 pl-6">If checked, users can select multiple units of the same option (e.g., Extra Cheese x2).</p>

                          <div className="pt-2">
                             <label className="block text-xs font-bold text-gray-500 mb-1">Display Context</label>
                             <div className="flex gap-2">
                                 {['both', 'combo', 'alaCarte'].map(mode => (
                                     <button 
                                        key={mode}
                                        onClick={() => setEditingGroup({...editingGroup, displayMode: mode as any})}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border ${editingGroup.displayMode === mode || (!editingGroup.displayMode && mode === 'both') ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-gray-600 border-gray-300'}`}
                                     >
                                         {mode === 'alaCarte' ? 'Ala Carte' : mode}
                                     </button>
                                 ))}
                             </div>
                          </div>
                      </div>

                      <div className="pt-4 border-t space-y-4">
                          <div className="flex items-center justify-between">
                              <h4 className="font-bold text-lg">Options</h4>
                              <button 
                                onClick={() => setEditingGroup({
                                    ...editingGroup, 
                                    options: [...editingGroup.options, {name: 'New Option', price: 0, type: 'addon'}]
                                })}
                                className="text-green-600 text-xs font-bold flex items-center gap-1"
                              >
                                  <Plus size={14}/> Add Option
                              </button>
                          </div>
                          
                          <div className="space-y-3">
                              {editingGroup.options.map((opt, idx) => (
                                  <div key={idx} className="border border-gray-200 p-3 rounded-lg bg-white relative group">
                                      <div className="flex gap-3 mb-2">
                                          <div className="w-16 h-16 bg-white rounded border border-gray-200 flex items-center justify-center relative overflow-hidden shrink-0 cursor-pointer">
                                              {opt.imageUrl ? <img src={opt.imageUrl} className="w-full h-full object-cover"/> : <ImageIcon className="text-gray-300" size={16}/>}
                                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, 'option', idx)}/>
                                          </div>
                                          <div className="flex-1 space-y-2">
                                              <input 
                                                  className="w-full border-b border-gray-200 pb-1 font-bold text-sm outline-none bg-transparent placeholder-gray-400 text-black"
                                                  placeholder="Option Name"
                                                  value={opt.name}
                                                  onChange={(e) => {
                                                      const newOpts = [...editingGroup.options];
                                                      newOpts[idx].name = e.target.value;
                                                      setEditingGroup({...editingGroup, options: newOpts});
                                                  }}
                                              />
                                              <div className="flex gap-2">
                                                  <div className="flex items-center border border-gray-200 rounded px-2 bg-gray-50">
                                                      <span className="text-xs text-gray-500 mr-1">+</span>
                                                      <input 
                                                          type="number"
                                                          className="w-16 bg-transparent outline-none text-xs font-bold py-1 text-black"
                                                          placeholder="0.00"
                                                          value={opt.price}
                                                          onChange={(e) => {
                                                              const newOpts = [...editingGroup.options];
                                                              newOpts[idx].price = parseFloat(e.target.value);
                                                              setEditingGroup({...editingGroup, options: newOpts});
                                                          }}
                                                      />
                                                  </div>
                                                  <select 
                                                      className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-black"
                                                      value={opt.type}
                                                      onChange={(e) => {
                                                          const newOpts = [...editingGroup.options];
                                                          newOpts[idx].type = e.target.value as any;
                                                          setEditingGroup({...editingGroup, options: newOpts});
                                                      }}
                                                  >
                                                      <option value="addon">Addon</option>
                                                      <option value="preference">Preference</option>
                                                  </select>
                                                  
                                                  <button 
                                                      onClick={() => {
                                                          const newOpts = [...editingGroup.options];
                                                          newOpts[idx].isComboTrigger = !newOpts[idx].isComboTrigger;
                                                          setEditingGroup({...editingGroup, options: newOpts});
                                                      }}
                                                      className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border transition-colors ${opt.isComboTrigger ? 'bg-brand-yellow border-brand-yellow text-brand-black' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                                      title="Trigger Combo Mode when selected"
                                                  >
                                                      <Zap size={10} className={opt.isComboTrigger ? 'fill-black' : ''}/>
                                                      {opt.isComboTrigger ? 'Combo' : 'Std'}
                                                  </button>
                                              </div>
                                          </div>
                                          <button 
                                              onClick={() => {
                                                  const newOpts = editingGroup.options.filter((_, i) => i !== idx);
                                                  setEditingGroup({...editingGroup, options: newOpts});
                                              }}
                                              className="text-gray-300 hover:text-red-500 self-start"
                                          >
                                              <Trash2 size={14}/>
                                          </button>
                                      </div>
                                      <textarea 
                                          className="w-full text-xs border border-gray-100 rounded p-2 bg-gray-50 focus:bg-white transition-colors outline-none text-black"
                                          placeholder="Description (optional)"
                                          rows={1}
                                          value={opt.description || ''}
                                          onChange={(e) => {
                                              const newOpts = [...editingGroup.options];
                                              newOpts[idx].description = e.target.value;
                                              setEditingGroup({...editingGroup, options: newOpts});
                                          }}
                                      />
                                  </div>
                              ))}
                              {editingGroup.options.length === 0 && (
                                  <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                      No options added yet.
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col animate-in slide-in-from-bottom-10 text-brand-black font-sans">
      
      {/* 1. Top Navigation Bar */}
      <div className="bg-white px-4 border-b flex items-center justify-between h-16 shrink-0 z-20">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-50 rounded-full"><X className="text-gray-500"/></button>
          
          <div className="flex h-full gap-2 md:gap-8 overflow-x-auto hide-scroll">
              <button 
                onClick={() => setMainTab('items')}
                className={`h-full flex items-center px-2 font-bold text-sm border-b-2 transition-colors ${mainTab === 'items' ? 'border-brand-black text-brand-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  Items
              </button>
              <button 
                onClick={() => setMainTab('optionGroups')}
                className={`h-full flex items-center px-2 font-bold text-sm border-b-2 transition-colors ${mainTab === 'optionGroups' ? 'border-brand-black text-brand-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  Option Groups
              </button>
              <button 
                onClick={() => setMainTab('system')}
                className={`h-full flex items-center px-2 font-bold text-sm border-b-2 transition-colors ${mainTab === 'system' ? 'border-brand-black text-brand-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  System
              </button>
          </div>

          <button onClick={() => setMainTab('settings')} className={`p-2 rounded-full hover:bg-gray-50 ${mainTab === 'settings' ? 'bg-gray-100 text-brand-black' : 'text-gray-500'}`}>
              <Settings size={20}/>
          </button>
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-3xl mx-auto py-6 px-4">
              
              {mainTab === 'items' && renderItemsView()}
              {mainTab === 'optionGroups' && renderGroupsView()}
              {mainTab === 'system' && renderSystemView()}
              
              {mainTab === 'settings' && (
                  <div className="space-y-6">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                          {['branding', 'outlets', 'ads'].map(t => (
                              <button key={t} onClick={() => setSettingsTab(t as any)} className={`px-4 py-2 rounded-full border text-sm font-bold capitalize whitespace-nowrap ${settingsTab === t ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-gray-600 border-gray-200'}`}>
                                  {t}
                              </button>
                          ))}
                      </div>
                      
                      {settingsTab === 'branding' && (
                          <div className="space-y-6">
                              <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                                  <h3 className="font-bold text-lg">Identity</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 block mb-1">Brand Logo</label>
                                          <div className="w-24 h-24 bg-white rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-brand-black transition-colors">
                                              {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain"/> : <span className="text-gray-400 text-xs">Upload</span>}
                                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={e => handleImageUpload(e, 'logo')}/>
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 block mb-1">Company Name</label>
                                          <input 
                                            className="w-full border border-gray-300 bg-white p-3 rounded-lg text-black font-medium focus:border-black outline-none" 
                                            placeholder="Stupiak's" 
                                            value={config.heroTitle} 
                                            onChange={e => setConfig({...config, heroTitle: e.target.value})}
                                          />
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                                  <h3 className="font-bold text-lg">Homepage Hero</h3>
                                  <div className="h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-black transition-colors">
                                      {config.heroImageUrl ? <img src={config.heroImageUrl} className="w-full h-full object-cover"/> : <span className="text-gray-400">Upload Hero Image</span>}
                                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={e => handleImageUpload(e, 'hero')}/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 block mb-1">Hero Subtitle</label>
                                      <input 
                                        className="w-full border border-gray-300 bg-white p-3 rounded-lg text-black font-medium focus:border-black outline-none" 
                                        placeholder="Hero Subtitle / Description" 
                                        value={config.heroSubtitle} 
                                        onChange={e => setConfig({...config, heroSubtitle: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                                  <h3 className="font-bold text-lg">About Section</h3>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 block mb-1">Title</label>
                                      <input 
                                        className="w-full border border-gray-300 bg-white p-3 rounded-lg text-black font-medium focus:border-black outline-none" 
                                        placeholder="Title (e.g. About Us)" 
                                        value={config.aboutTitle} 
                                        onChange={e => setConfig({...config, aboutTitle: e.target.value})}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 block mb-1">Description</label>
                                      <textarea 
                                        className="w-full border border-gray-300 bg-white p-3 rounded-lg text-black font-medium focus:border-black outline-none" 
                                        placeholder="About Text" 
                                        rows={4} 
                                        value={config.aboutText} 
                                        onChange={e => setConfig({...config, aboutText: e.target.value})}
                                      />
                                  </div>
                              </div>
                          </div>
                      )}

                      {settingsTab === 'outlets' && (
                          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                              <h3 className="font-bold">Outlets</h3>
                              {outlets.map((o, i) => (
                                  <div key={o.id} className="border border-gray-200 p-4 rounded-xl bg-white space-y-3 shadow-sm">
                                      <input 
                                        className="font-bold text-lg bg-white border border-gray-300 rounded-lg p-2 w-full text-black focus:border-black outline-none" 
                                        placeholder="Outlet Name" 
                                        value={o.name} 
                                        onChange={e => {const n=[...outlets]; n[i].name=e.target.value; setOutlets(n)}}
                                      />
                                      <input 
                                        className="text-sm border border-gray-300 p-2 rounded-lg w-full bg-white text-black focus:border-black outline-none" 
                                        placeholder="Address" 
                                        value={o.address} 
                                        onChange={e => {const n=[...outlets]; n[i].address=e.target.value; setOutlets(n)}}
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                           <input 
                                              className="text-sm border border-gray-300 p-2 rounded-lg w-full bg-white text-black focus:border-black outline-none" 
                                              placeholder="Whatsapp (601...)" 
                                              value={o.whatsappNumber} 
                                              onChange={e => {const n=[...outlets]; n[i].whatsappNumber=e.target.value; setOutlets(n)}}
                                           />
                                           <input 
                                              className="text-sm border border-gray-300 p-2 rounded-lg w-full bg-white text-black focus:border-black outline-none" 
                                              placeholder="Phone Display" 
                                              value={o.phone} 
                                              onChange={e => {const n=[...outlets]; n[i].phone=e.target.value; setOutlets(n)}}
                                           />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                           <div className="flex flex-col">
                                               <label className="text-[10px] text-gray-500 uppercase font-bold mb-1">Open</label>
                                               <input 
                                                  type="time" 
                                                  className="border border-gray-300 p-2 rounded-lg bg-white w-full text-black focus:border-black outline-none" 
                                                  value={o.openingTime} 
                                                  onChange={e => {const n=[...outlets]; n[i].openingTime=e.target.value; setOutlets(n)}}
                                               />
                                           </div>
                                           <div className="flex flex-col">
                                               <label className="text-[10px] text-gray-500 uppercase font-bold mb-1">Close</label>
                                               <input 
                                                  type="time" 
                                                  className="border border-gray-300 p-2 rounded-lg bg-white w-full text-black focus:border-black outline-none" 
                                                  value={o.closingTime} 
                                                  onChange={e => {const n=[...outlets]; n[i].closingTime=e.target.value; setOutlets(n)}}
                                               />
                                           </div>
                                      </div>
                                      <div className="flex justify-end mt-2">
                                           <button onClick={() => setConfirmModal({ message: 'Delete outlet?', action: () => setOutlets(outlets.filter((_, idx) => idx !== i)) })} className="text-red-500 text-xs font-bold px-3 py-1 hover:bg-red-50 rounded">Remove Outlet</button>
                                      </div>
                                  </div>
                              ))}
                              <button onClick={() => setOutlets([...outlets, {...outlets[0], id: `new-${Date.now()}`, name: 'New Outlet'}])} className="w-full py-3 bg-brand-black text-white rounded-lg font-bold text-sm">+ Add Outlet</button>
                          </div>
                      )}

                      {settingsTab === 'ads' && (
                          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-6 shadow-sm">
                              <h3 className="font-bold flex items-center justify-between text-lg">
                                  <span>Ad Posters</span>
                                  <button onClick={() => setConfig({...config, adPosters: [...config.adPosters, {id: `ad-${Date.now()}`, title: 'New Ad', imageUrl: '', isActive: true}]})} className="text-green-600 text-sm flex items-center gap-1 font-bold">+ Add Poster</button>
                              </h3>
                              
                              <div className="space-y-6">
                                  {config.adPosters.map((ad, i) => (
                                      <div key={ad.id} className="border border-gray-200 p-4 rounded-xl bg-white relative shadow-sm hover:shadow-md transition-shadow">
                                          {/* Header: Title and Delete */}
                                          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                               <input 
                                                  className="flex-1 font-bold text-lg bg-transparent border-none focus:ring-0 p-0 text-black placeholder-gray-400" 
                                                  placeholder="Ad Campaign Title" 
                                                  value={ad.title} 
                                                  onChange={e => {
                                                      const n = [...config.adPosters]; n[i].title = e.target.value; setConfig({...config, adPosters: n});
                                                  }}
                                               />
                                               <div className="flex items-center gap-2">
                                                    <button onClick={() => onPreviewAd && onPreviewAd(ad)} className="text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full hover:bg-gray-200" title="Preview Ad Popup"><Eye size={18}/></button>
                                                    <button onClick={(e) => {e.stopPropagation(); setConfirmModal({ message: 'Delete ad?', action: () => { const n = config.adPosters.filter(poster => poster.id !== ad.id); setConfig({...config, adPosters: n}) }}) }} className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-full hover:bg-red-100"><Trash2 size={18}/></button>
                                               </div>
                                          </div>

                                          <div className="flex flex-col md:flex-row gap-6">
                                               {/* Image Upload */}
                                               <div className="w-32 h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group shrink-0">
                                                   {ad.imageUrl ? <img src={ad.imageUrl} className="w-full h-full object-cover"/> : <ImageIcon className="text-gray-400"/>}
                                                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-xs font-bold transition-opacity">Change Image</div>
                                                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={e => handleImageUpload(e, 'ad', i)}/>
                                               </div>

                                               {/* Fields */}
                                               <div className="flex-1 space-y-3">
                                                   {/* Links */}
                                                   <div className="grid grid-cols-2 gap-3">
                                                       <div>
                                                           <label className="block text-[10px] text-gray-500 font-bold mb-1">Link to Item</label>
                                                           <select 
                                                              className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white text-black" 
                                                              value={ad.linkToItem || ''} 
                                                              onChange={e => {
                                                                 const n = [...config.adPosters]; n[i].linkToItem = e.target.value || undefined; n[i].linkToCategory = undefined; n[i].externalUrl = undefined; setConfig({...config, adPosters: n});
                                                              }}
                                                           >
                                                               <option value="">None</option>
                                                               {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                           </select>
                                                       </div>
                                                       <div>
                                                           <label className="block text-[10px] text-gray-500 font-bold mb-1">Link to Category</label>
                                                           <select 
                                                              className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white text-black" 
                                                              value={ad.linkToCategory || ''} 
                                                              onChange={e => {
                                                                 const n = [...config.adPosters]; n[i].linkToCategory = e.target.value || undefined; n[i].linkToItem = undefined; n[i].externalUrl = undefined; setConfig({...config, adPosters: n});
                                                              }}
                                                           >
                                                               <option value="">None</option>
                                                               {config.categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                                           </select>
                                                       </div>
                                                   </div>

                                                   {/* External URL */}
                                                   <div>
                                                       <label className="block text-[10px] text-gray-500 font-bold mb-1">Or External URL</label>
                                                       <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                                                            <div className="p-2 bg-gray-50 border-r border-gray-300"><ExternalLink size={14} className="text-gray-400"/></div>
                                                            <input 
                                                                className="flex-1 p-2 text-xs bg-white text-black outline-none"
                                                                placeholder="https://example.com"
                                                                value={ad.externalUrl || ''}
                                                                onChange={e => {
                                                                    const n = [...config.adPosters]; 
                                                                    n[i].externalUrl = e.target.value; 
                                                                    if(e.target.value) { n[i].linkToItem = undefined; n[i].linkToCategory = undefined; }
                                                                    setConfig({...config, adPosters: n});
                                                                }}
                                                            />
                                                       </div>
                                                   </div>
                                                   
                                                   {/* Scheduling */}
                                                   <div className="grid grid-cols-2 gap-3">
                                                       <div>
                                                           <label className="block text-[10px] text-gray-500 font-bold mb-1">Start Time</label>
                                                           <input 
                                                              type="datetime-local" 
                                                              className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white text-black"
                                                              value={ad.startTime || ''}
                                                              onChange={e => {
                                                                  const n = [...config.adPosters]; n[i].startTime = e.target.value; setConfig({...config, adPosters: n});
                                                              }}
                                                           />
                                                       </div>
                                                       <div>
                                                           <label className="block text-[10px] text-gray-500 font-bold mb-1">End Time</label>
                                                           <input 
                                                              type="datetime-local" 
                                                              className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white text-black"
                                                              value={ad.endTime || ''}
                                                              onChange={e => {
                                                                  const n = [...config.adPosters]; n[i].endTime = e.target.value; setConfig({...config, adPosters: n});
                                                              }}
                                                           />
                                                       </div>
                                                   </div>

                                                   {/* Active Toggle */}
                                                   <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 select-none">
                                                       <div className={`w-10 h-6 rounded-full p-1 transition-colors ${ad.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                           <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${ad.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                                       </div>
                                                       <input type="checkbox" className="hidden" checked={ad.isActive} onChange={e => {
                                                           const n = [...config.adPosters]; n[i].isActive = e.target.checked; setConfig({...config, adPosters: n});
                                                       }}/>
                                                       <span className="font-bold text-gray-700">Campaign Active</span>
                                                   </label>
                                               </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {renderItemEditor()}
      {renderGroupEditor()}
      {renderCategoryEditor()}
      {showAvailabilityMatrix && renderAvailabilityMatrix()}
      
      {/* Add Category Modal */}
      {showAddCatModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 border border-gray-200">
                  <h3 className="font-bold text-lg mb-4 text-black">Add Category</h3>
                  <input className="w-full border border-gray-300 bg-white p-3 rounded-lg mb-4 text-black outline-none focus:border-black" placeholder="Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAddCatModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={() => { if(newCatName) { setConfig({...config, categories: [...config.categories, {name: newCatName}]}); setNewCatName(''); setShowAddCatModal(false); } }} className="px-6 py-2 bg-brand-black text-white font-bold rounded-lg hover:bg-gray-800">Add</button>
                  </div>
              </div>
          </div>
      )}

      {/* CUSTOM CONFIRMATION / ALERT MODAL */}
      {confirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 transform transition-all scale-100">
                  <div className="flex items-center gap-3 mb-2">
                      {confirmModal.isAlert && <Info size={24} className="text-brand-black"/>}
                      <h3 className="font-bold text-xl text-brand-black">{confirmModal.title || 'Are you sure?'}</h3>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">{confirmModal.message}</p>
                  <div className="flex justify-end gap-3">
                      {!confirmModal.isAlert && (
                          <button 
                              onClick={() => setConfirmModal(null)} 
                              className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm"
                          >
                              Cancel
                          </button>
                      )}
                      <button 
                          onClick={() => { if(confirmModal.action) confirmModal.action(); setConfirmModal(null); }} 
                          className={`px-6 py-2 font-bold rounded-lg shadow-md text-sm ${confirmModal.isAlert ? 'bg-brand-black text-white hover:bg-gray-800' : 'bg-red-600 text-white hover:bg-red-700'}`}
                      >
                          {confirmModal.isAlert ? 'OK' : 'Yes, Confirm'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;