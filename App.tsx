import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingBag, X, ChevronRight, Share2, Lock, MapPin, Clock, Info, RefreshCw, UtensilsCrossed, Home, ChevronLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { MENU_ITEMS, DEFAULT_CONFIG, DEFAULT_OUTLETS } from './constants';
import { MenuItem, CartItem, MenuItemOption, AppConfig, Outlet, FlowGroup, AdPoster } from './types';
// import MenuAssistant from './components/MenuAssistant'; // DISABLED
import AdminPanel from './components/AdminPanel';
import FlowModal from './components/FlowModal';
import CartDrawer from './components/CartDrawer';

const App: React.FC = () => {
  // --- GLOBAL APP STATE ---
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [outlets, setOutlets] = useState<Outlet[]>(DEFAULT_OUTLETS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  
  // --- USER SESSION STATE ---
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false); 
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [needsCutlery, setNeedsCutlery] = useState(false);
  const [sortedOutlets, setSortedOutlets] = useState<Outlet[]>(outlets);
  
  // ADS STATE
  const [showAdModal, setShowAdModal] = useState(false); 
  const [activeAdIndex, setActiveAdIndex] = useState(0); // Track index for Popup Slider
  
  // SWIPE STATE
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // --- ADMIN ACCESS STATE ---
  const [adminClickCount, setAdminClickCount] = useState(0);

  // --- LEADING FLOW STATE ---
  const [flowActive, setFlowActive] = useState(false);
  const [activeFlowGroup, setActiveFlowGroup] = useState<FlowGroup | null>(null);
  const [flowMode, setFlowMode] = useState<'alaCarte' | 'combo'>('alaCarte');
  const [flowItem, setFlowItem] = useState<MenuItem | null>(null); 
  const [flowStepIndex, setFlowStepIndex] = useState(0);
  const [flowHistory, setFlowHistory] = useState<{step: number, selections: MenuItemOption[]}[]>([]); 
  const [flowMeatFilter, setFlowMeatFilter] = useState<string | null>(null); 
  const [tempFlowSelectedOptions, setTempFlowSelectedOptions] = useState<MenuItemOption[]>([]);
  // Special state to force the Review step
  const [isReviewStep, setIsReviewStep] = useState(false);
  // NEW: State to track if we are editing a previous step from Review
  const [isEditingStep, setIsEditingStep] = useState(false);

  // Sub-item Customization
  const [isCustomizingSubItem, setIsCustomizingSubItem] = useState(false);
  const [subItemToCustomize, setSubItemToCustomize] = useState<MenuItem | null>(null);

  // --- CART & UI STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [editingCartItemUuid, setEditingCartItemUuid] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [isManualScroll, setIsManualScroll] = useState(false); 
  const adsScrollRef = useRef<HTMLDivElement>(null); 
  const navContainerRef = useRef<HTMLDivElement>(null);
  
  // --- DERIVED STATE ---
  const currentOutlet = useMemo(() => outlets.find(o => o.id === selectedOutletId), [outlets, selectedOutletId]);
  
  const formatPrice = (price: number) => {
      if (price === 0) return "";
      return `${config.currencySymbol} ${price.toFixed(2)}`;
  };

  const getSectionId = (name: string) => "section-" + name.replace(/[^a-z0-9]/gi, '');

  const getCurrentFlowSteps = () => {
      // 1. Flow Group Logic (Category Triggers - Legacy/Advanced)
      if (activeFlowGroup) {
          const steps: string[] = ['Variation']; 
          if (flowItem && flowItem.linkedOptionGroupIds) {
              flowItem.linkedOptionGroupIds.forEach(gid => {
                  const group = config.optionGroups?.find(g => g.id === gid);
                  if (group) {
                      const mode = group.displayMode || 'both';
                      if (mode === 'both' || mode === flowMode) {
                           steps.push(group.id); 
                      }
                  }
              });
          }
          return steps;
      }

      // 2. Direct Item Link Logic (The Strict Flow Setup)
      const steps: string[] = [];
      if (flowItem) {
          if (flowItem.linkedOptionGroupIds && flowItem.linkedOptionGroupIds.length > 0) {
              flowItem.linkedOptionGroupIds.forEach(gid => {
                  const group = config.optionGroups?.find(g => g.id === gid);
                  if (group) {
                      steps.push(group.id); 
                  }
              });
          } else if (flowItem.options && flowItem.options.length > 0) {
              steps.push('Addon');
          }
      }
      return steps;
  };

  const activeAds = useMemo(() => {
      const now = new Date();
      return config.adPosters.filter(ad => {
          if (!ad.isActive) return false;
          if (ad.startTime && new Date(ad.startTime) > now) return false;
          if (ad.endTime && new Date(ad.endTime) < now) return false;
          return true;
      });
  }, [config.adPosters]);

  const currentPopupAd = useMemo(() => {
      if (activeAds.length === 0) return null;
      return activeAds[activeAdIndex % activeAds.length];
  }, [activeAds, activeAdIndex]);

  // Filter Items by Outlet
  const visibleMenuItems = useMemo(() => {
      return menuItems.filter(item => {
          if (item.isHidden) return false;
          if (selectedOutletId && item.availabilityOutlets && item.availabilityOutlets.length > 0) {
              return item.availabilityOutlets.includes(selectedOutletId);
          }
          return true;
      });
  }, [menuItems, selectedOutletId]);

  // --- EFFECT HOOKS ---
  useEffect(() => {
    if (config.categories.length > 0 && !activeTabId) {
        setActiveTabId(getSectionId(config.categories[0].name));
    }
  }, [config.categories]);

  useEffect(() => {
      setShowGatekeeper(config.enableLandingGatekeeper);
  }, [config.enableLandingGatekeeper, selectedOutletId]);

  useEffect(() => {
    setSortedOutlets(outlets);
  }, [outlets]);

  // HANDLE SHARE LINK (DEEP LINKING)
  useEffect(() => {
      // Check URL parameters for item ID
      const params = new URLSearchParams(window.location.search);
      const sharedItemId = params.get('item');
      
      if (sharedItemId && !showGatekeeper && !selectedOutletId) {
          // If we have a shared item but no outlet selected yet, select default or show gatekeeper first?
          // For simplicity, let's assume we need to select an outlet first if strict, OR just show it if no gatekeeper.
          // If gatekeeper is off, we can show it immediately.
          const item = menuItems.find(i => i.id === sharedItemId);
          if (item) {
              // Wait a bit for initialization
              setTimeout(() => {
                  handleItemSelect(item, true);
                  // Clean URL
                  window.history.replaceState({}, document.title, window.location.pathname);
              }, 500);
          }
      } else if (sharedItemId && selectedOutletId) {
           const item = menuItems.find(i => i.id === sharedItemId);
           if (item) {
               handleItemSelect(item, true);
               window.history.replaceState({}, document.title, window.location.pathname);
           }
      }
  }, [menuItems, selectedOutletId, showGatekeeper]);

  // Trigger Ad Modal when Outlet Selected (Auto Popup)
  useEffect(() => {
      if (!isAdminOpen && selectedOutletId && activeAds.length > 0) {
          setActiveAdIndex(0);
          setShowAdModal(true);
      }
  }, [selectedOutletId, activeAds.length, isAdminOpen]);

  // Auto Scroll Ads (Banner) - Infinite Loop
  useEffect(() => {
      if (showGatekeeper || !selectedOutletId || activeAds.length < 2) return;
      
      const interval = setInterval(() => {
          scrollAds('right');
      }, 5000); 
      
      return () => clearInterval(interval);
  }, [showGatekeeper, selectedOutletId, activeAds.length]);

  // Auto Scroll Popup Ads
  useEffect(() => {
      if (!showAdModal || activeAds.length < 2) return;
      
      const interval = setInterval(() => {
          setActiveAdIndex(prev => (prev + 1) % activeAds.length);
      }, 4000);
      
      return () => clearInterval(interval);
  }, [showAdModal, activeAds.length]);

  // Scroll Spy & Auto-Scroll Nav Bar
  useEffect(() => {
    if (showGatekeeper) return; 
    const handleScroll = () => {
      if (isManualScroll) return;
      const headerOffset = 180; 
      const sections = config.categories.map(cat => document.getElementById(getSectionId(cat.name)));
      let currentActive = activeTabId;
      
      for (const section of sections) {
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= headerOffset && rect.bottom >= headerOffset) {
            currentActive = section.id;
            break;
          }
        }
      }
      
      if (currentActive !== activeTabId) {
          setActiveTabId(currentActive);
          
          // Auto Scroll Nav Bar
          if (navContainerRef.current) {
              const activeBtn = document.getElementById(`tab-btn-${currentActive}`);
              if (activeBtn) {
                  const container = navContainerRef.current;
                  const scrollLeft = activeBtn.offsetLeft - (container.offsetWidth / 2) + (activeBtn.offsetWidth / 2);
                  container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
              }
          }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTabId, config.categories, isManualScroll, showGatekeeper]);

  // Geolocation
  useEffect(() => {
    if (!selectedOutletId && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const sorted = [...outlets].sort((a, b) => {
                    const distA = Math.sqrt(Math.pow((a.lat || 0) - latitude, 2) + Math.pow((a.lng || 0) - longitude, 2));
                    const distB = Math.sqrt(Math.pow((b.lat || 0) - latitude, 2) + Math.pow((b.lng || 0) - longitude, 2));
                    return distA - distB;
                });
                setSortedOutlets(sorted);
            },
            (err) => console.log("Location access denied or error:", err),
            { timeout: 5000 }
        );
    }
  }, [outlets, selectedOutletId]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const isBusinessOpen = useMemo(() => {
    if (!config.isStoreOpen) return false;
    if (!currentOutlet) return false;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = currentOutlet.openingTime.split(':').map(Number);
    const [closeH, closeM] = currentOutlet.closingTime.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    if (closeTime < openTime) return currentTime >= openTime || currentTime < closeTime;
    return currentTime >= openTime && currentTime < closeTime;
  }, [config.isStoreOpen, currentOutlet]);

  // --- HANDLERS ---
  const handleTabClick = (catName: string) => {
      setIsManualScroll(true);
      const sectionId = getSectionId(catName);
      setActiveTabId(sectionId);
      setShowGatekeeper(false); 
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Also scroll nav
      if (navContainerRef.current) {
          const activeBtn = document.getElementById(`tab-btn-${sectionId}`);
          if (activeBtn) {
              const container = navContainerRef.current;
              const scrollLeft = activeBtn.offsetLeft - (container.offsetWidth / 2) + (activeBtn.offsetWidth / 2);
              container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }
      }

      setTimeout(() => setIsManualScroll(false), 800);
  };

  const handleGatekeeperSelect = (targetName: string) => {
      const firstCatWithMeat = config.categories.find(cat => 
          menuItems.some(item => item.category === cat.name && item.meatType === targetName)
      );

      if (firstCatWithMeat) {
          setShowGatekeeper(false);
          const sectionId = getSectionId(firstCatWithMeat.name);
          setActiveTabId(sectionId);
          setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
          setShowGatekeeper(false);
      }
  };

  const handleShare = (itemId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?item=${itemId}`;
    navigator.clipboard.writeText(url).then(() => setToastMessage("Link copied!"));
  };

  const handleAdClick = (ad: AdPoster) => {
    setShowAdModal(false);
    
    if (ad.externalUrl) {
        window.open(ad.externalUrl, '_blank');
        return;
    }

    if(ad.linkToItem) {
        const item = menuItems.find(i=>i.id===ad.linkToItem);
        // FORCE MODAL: Pass true as second arg to force the item view popup
        if(item) handleItemSelect(item, true); 
    } else if (ad.linkToCategory) {
        handleTabClick(ad.linkToCategory);
    }
  };

  const handlePreviewAd = (ad: AdPoster) => {
      const idx = activeAds.findIndex(a => a.id === ad.id);
      setActiveAdIndex(idx >= 0 ? idx : 0);
      setShowAdModal(true);
  };

  const handleAdminTrigger = () => {
      setAdminClickCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 5) {
              setIsAdminOpen(true);
              return 0;
          }
          return newCount;
      });
  };

  // --- FLOW HANDLERS ---
  const handleItemSelect = (item: MenuItem, forceModal = false) => {
      const group = config.flowGroups?.find(g => g.triggers.includes(item.category));
      
      // 1. Explicit Flow Group Trigger
      if (group) {
          startFlow(group, 'alaCarte', item);
          return;
      }
      
      // 2. Step-by-Step Flow (Linked Option Groups)
      const hasLinkedOptions = item.linkedOptionGroupIds && item.linkedOptionGroupIds.length > 0;
      if (hasLinkedOptions) {
          setFlowItem(item);
          setActiveFlowGroup(null);
          setFlowStepIndex(0); 
          setFlowHistory([]);
          setFlowMeatFilter(null);
          setTempFlowSelectedOptions([]);
          setFlowMode('alaCarte'); 
          setIsReviewStep(false); 
          setIsEditingStep(false);
          setFlowActive(true);
          return;
      }

      // 3. Fallback: Inline Options or Force Modal
      const hasInlineOptions = item.options && item.options.length > 0;
      if(forceModal || hasInlineOptions) {
         setFlowItem(item);
         setActiveFlowGroup(null);
         setFlowStepIndex(0); 
         setFlowHistory([]);
         setFlowMeatFilter(null);
         setTempFlowSelectedOptions([]);
         setFlowMode('alaCarte');
         setIsReviewStep(false);
         setIsEditingStep(false);
         setFlowActive(true);
      } else {
         // 4. Direct Add to Cart (No options)
         addToCart(item, []);
      }
  };

  const startFlow = (group: FlowGroup, mode: 'alaCarte' | 'combo', item: MenuItem) => {
      setFlowItem(item);
      setActiveFlowGroup(group);
      setFlowMode(mode);
      setFlowStepIndex(0);
      setFlowHistory([]);
      
      if (item.meatType && item.meatType !== 'All') {
          setFlowMeatFilter(item.meatType);
      } else {
          setFlowMeatFilter(null);
      }
      
      setTempFlowSelectedOptions([]);
      setIsReviewStep(false);
      setIsEditingStep(false);
      setFlowActive(true);
  };

  const handleFlowBack = () => {
      // If we were editing a single step, cancel edit and go back to review
      if (isEditingStep) {
          setIsEditingStep(false);
          setIsReviewStep(true);
          return;
      }

      if (isReviewStep) {
          setIsReviewStep(false);
          // Go to last step
          const steps = getCurrentFlowSteps();
          setFlowStepIndex(steps.length - 1);
          return;
      }

      if (flowStepIndex <= 0) {
          setFlowActive(false);
          return;
      }
      const prevStepIndex = flowStepIndex - 1;
      setFlowStepIndex(prevStepIndex);
      const newHistory = [...flowHistory];
      newHistory.pop(); 
      setFlowHistory(newHistory);
  };

  const handleJumpToStep = (index: number) => {
      setFlowStepIndex(index);
      setIsReviewStep(false);
      setIsEditingStep(true);
  };

  const handleFlowNext = (currentStepSelections: MenuItemOption[], specificItem?: MenuItem) => {
      // If we are in review step, 'Next' means Add to Cart
      if (isReviewStep) {
          const finalSelections = collectAllSelections(); // Just use history since temp is cleared
          addToCart(flowItem!, finalSelections, flowMode === 'combo');
          setFlowActive(false);
          setIsReviewStep(false);
          return;
      }

      if (!flowItem) return;

      // Handle Edit Mode: Save Changes and Return to Review
      if (isEditingStep) {
          // Update the history for this specific step
          const newHistory = [...flowHistory];
          const existingHistoryIndex = newHistory.findIndex(h => h.step === flowStepIndex);
          
          if (existingHistoryIndex >= 0) {
              newHistory[existingHistoryIndex] = { step: flowStepIndex, selections: currentStepSelections };
          } else {
              // Should theoretically exist if we jumped, but safe fallback
              newHistory.push({ step: flowStepIndex, selections: currentStepSelections });
              newHistory.sort((a,b) => a.step - b.step);
          }
          
          setFlowHistory(newHistory);
          setIsEditingStep(false);
          setIsReviewStep(true);
          return;
      }

      // Normal Flow Logic
      let nextItemContext = flowItem;
      if (specificItem) {
          nextItemContext = specificItem;
          setFlowItem(specificItem);
      }

      const hasComboTrigger = currentStepSelections.some(opt => opt.isComboTrigger);
      if (hasComboTrigger) {
          setFlowMode('combo');
      }

      const steps = getCurrentFlowSteps();
      const currentStepType = steps[flowStepIndex];

      if (currentStepType === 'Meat') {
          const selectedMeat = currentStepSelections[0]?.name;
          if (selectedMeat) setFlowMeatFilter(selectedMeat);
      }

      if (!specificItem) { 
          setFlowHistory([...flowHistory, { step: flowStepIndex, selections: currentStepSelections }]);
      } else {
          setFlowHistory([...flowHistory, { step: flowStepIndex, selections: [] }]);
      }

      if (currentStepType === 'Variation' && activeFlowGroup?.enableComboOption) {
          setFlowMode('combo');
      }

      const effectiveMode = hasComboTrigger ? 'combo' : flowMode;
      const nextSteps: string[] = [];
      if (activeFlowGroup) {
           nextSteps.push('Variation');
      }
      if (nextItemContext.linkedOptionGroupIds) {
          nextItemContext.linkedOptionGroupIds.forEach(gid => {
              const group = config.optionGroups?.find(g => g.id === gid);
              if (group) {
                  const mode = group.displayMode || 'both';
                  if (mode === 'both' || mode === effectiveMode) nextSteps.push(group.id);
              }
          });
      } else if (nextItemContext.options && nextItemContext.options.length > 0 && !activeFlowGroup) {
          nextSteps.push('Addon');
      }

      let hasMoreSteps = flowStepIndex < nextSteps.length - 1;
      
      if (currentStepType === 'Variation' && activeFlowGroup?.enableComboOption) {
          hasMoreSteps = true;
      }

      if (hasMoreSteps) {
          setFlowStepIndex(flowStepIndex + 1);
          setTempFlowSelectedOptions([]);
      } else {
          setIsReviewStep(true);
          setTempFlowSelectedOptions([]); 
      }
  };

  const collectAllSelections = () => {
      return flowHistory.flatMap(h => h.selections);
  };

  // Helper to compute prices without double-counting during edits
  const getHistoryForPrice = () => {
      if (isEditingStep) {
          // If editing, exclude the current step from history so we don't double count it with localSelections
          return flowHistory.filter(h => h.step !== flowStepIndex).flatMap(h => h.selections);
      }
      return flowHistory.flatMap(h => h.selections);
  };

  // Helper to get initial selections for the current step (for pre-filling UI)
  const getCurrentStepInitialSelections = () => {
      if (isEditingStep) {
          return flowHistory.find(h => h.step === flowStepIndex)?.selections || [];
      }
      return []; // Normal flow starts fresh
  };

  const addToCart = (item: MenuItem, selectedOptions: MenuItemOption[], isCombo = false) => {
    const finalPrice = (isCombo && item.comboPrice) ? item.comboPrice : item.price;
    const finalItem = { ...item, price: finalPrice };

    if (editingCartItemUuid) {
        setCart(prev => prev.map(ci => ci.uuid === editingCartItemUuid ? { ...ci, selectedOptions, price: finalPrice, isCombo } : ci));
        setToastMessage(`Order updated!`);
        setEditingCartItemUuid(null);
        setIsCartOpen(true);
    } else {
        const uuid = crypto.randomUUID();
        setCart(prev => {
            const existingIdx = prev.findIndex(ci => ci.menuItemId === finalItem.id && JSON.stringify(ci.selectedOptions) === JSON.stringify(selectedOptions) && ci.isCombo === isCombo);
            if (existingIdx >= 0) {
                const newCart = [...prev];
                newCart[existingIdx].qty += 1;
                return newCart;
            }
            return [...prev, { uuid, menuItemId: finalItem.id, name: finalItem.name, price: finalItem.price, selectedOptions, qty: 1, isCombo }];
        });
        setAnimatingItems(prev => new Set(prev).add(finalItem.id));
        setTimeout(() => setAnimatingItems(prev => { const n = new Set(prev); n.delete(finalItem.id); return n; }), 200);
        setToastMessage(`Added ${finalItem.name}`);
    }
  };

  const updateCartItemQty = (uuid: string, delta: number) => {
    setCart(prev => prev.map(item => item.uuid === uuid ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter(item => item.qty > 0));
  };

  const handleCheckout = () => {
    if (cart.length === 0 || !currentOutlet) return;
    if (!isBusinessOpen) { return; } 
    const cartTotalAmount = cart.reduce((total, item) => total + ((item.price + item.selectedOptions.reduce((acc, opt) => acc + opt.price, 0)) * item.qty), 0);
    
    const orderLines = cart.map(item => {
      let line = `▪️ ${item.qty}x ${item.name} ${item.isCombo ? '(COMBO)' : ''}`;
      if (item.selectedOptions.length > 0) {
        const addons = item.selectedOptions.filter(o => o.type === 'addon').map(o => o.name);
        const prefs = item.selectedOptions.filter(o => o.type === 'preference').map(o => `NO ${o.name.replace(/^No\s+/i, '')}`);
        if (addons.length > 0) line += `\n   + ${addons.join(', ')}`;
        if (prefs.length > 0) line += `\n   ! ${prefs.join(', ')}`;
      }
      return line;
    }).join('\n');
    let message = config.whatsappTemplate.replace('{OUTLET}', currentOutlet.name).replace('{ORDER_LIST}', orderLines).replace('{TOTAL}', `${config.currencySymbol} ${cartTotalAmount.toFixed(2)}`).replace('{CUTLERY}', needsCutlery ? 'YES' : 'NO');
    window.open(`https://wa.me/${currentOutlet.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };
  
  const scrollAds = (direction: 'left' | 'right') => {
      if(adsScrollRef.current) {
          const container = adsScrollRef.current;
          // Responsive scroll amount: 50% on larger screens, 100% on mobile
          const isDesktop = window.innerWidth >= 768; // Tailwind md breakpoint
          const scrollAmount = isDesktop ? container.clientWidth / 2 : container.clientWidth; 
          
          if (direction === 'left' && container.scrollLeft <= 0) {
              // Loop to end
              container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
          } else if (direction === 'right' && container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
              // Loop to start
              container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
              container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
          }
      }
  };

  // --- TOUCH HANDLERS FOR POPUP ADS ---
  const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;
      if (isLeftSwipe) {
           setActiveAdIndex(prev => (prev + 1) % activeAds.length);
      }
      if (isRightSwipe) {
           setActiveAdIndex(prev => (prev - 1 + activeAds.length) % activeAds.length);
      }
  };
  
  // --- RENDERING ---
  
  // 1. Landing / Outlet Selector
  if (!selectedOutletId && !isAdminOpen) {
    return (
        <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                <div className="text-center mb-6">
                    <div 
                        className="w-20 h-20 rounded-xl mx-auto flex items-center justify-center mb-4 overflow-hidden cursor-pointer active:scale-95 transition-transform select-none"
                        onClick={handleAdminTrigger}
                    >
                        {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain" alt="Logo"/> : <span className="font-display font-bold text-4xl text-brand-black">S</span>}
                    </div>
                    <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-brand-black">{config.heroTitle}</h2>
                    <p className="text-gray-600 text-sm mt-1 font-medium">Select your nearest location</p>
                </div>
                <div className="space-y-3">{sortedOutlets.map(outlet => (<button key={outlet.id} onClick={() => setSelectedOutletId(outlet.id)} className="w-full flex items-center justify-between p-4 border rounded-xl hover:border-brand-yellow hover:bg-yellow-50 transition-all text-left group"><div><h3 className="font-bold text-lg text-brand-black">{outlet.name}</h3><p className="text-xs text-gray-600 flex items-center gap-1 mt-1 font-medium"><Clock size={10}/> {outlet.openingTime} - {outlet.closingTime}</p></div><ChevronRight className="text-gray-400 group-hover:text-brand-yellow" /></button>))}</div>
            </div>
        </div>
    );
  }

  // 2. Main App
  return (
    <div className="min-h-screen bg-brand-black font-sans">
      <div className={`bg-[#F4F4F4] min-h-screen flex flex-col transition-all duration-300 ${(isCartOpen || isAdminOpen || flowActive || isAboutOpen || isCustomizingSubItem || showAdModal) ? 'scale-95 brightness-50 pointer-events-none rounded-2xl overflow-hidden h-screen' : 'scale-100 min-h-screen'}`}>
        
        {/* HEADER */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center overflow-hidden">{config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain" alt="Logo"/> : <span className="font-display font-bold text-xl tracking-tighter text-brand-black">S</span>}</div>
                    <div className="flex flex-col justify-center">
                        <h1 className="font-display font-bold text-lg leading-none text-brand-black tracking-tight uppercase">{config.heroTitle}</h1>
                        <button onClick={() => { setSelectedOutletId(null); setShowGatekeeper(config.enableLandingGatekeeper); }} className="flex items-center gap-1 text-[10px] font-bold text-gray-600 uppercase tracking-wide hover:text-brand-black transition-colors text-left"><MapPin size={8} /> {currentOutlet?.name} <RefreshCw size={8} className="ml-0.5" /></button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-gray-100 rounded-full hover:bg-brand-yellow text-brand-black transition-colors"><ShoppingBag size={20} />{cart.reduce((a,c)=>a+c.qty,0) > 0 && (<span className="absolute -top-1 -right-1 bg-brand-black text-brand-yellow text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{cart.reduce((a,c)=>a+c.qty,0)}</span>)}</button>
                </div>
            </div>
        </header>

        {/* HERO IMAGE SECTION (Full Width) */}
        {!showGatekeeper && (
            <div className="w-full h-64 md:h-80 relative group overflow-hidden">
                {config.heroImageUrl ? (
                    <img src={config.heroImageUrl} className="w-full h-full object-cover" alt="Hero" />
                ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white font-bold">No Hero Image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end pb-8">
                     <div className="max-w-7xl mx-auto w-full px-4 text-center md:text-left">
                        <h2 className="font-display font-bold text-4xl md:text-6xl text-white uppercase leading-none drop-shadow-lg">{config.heroTitle}</h2>
                        <p className="text-lg md:text-xl text-brand-yellow font-display font-bold uppercase tracking-widest drop-shadow-md mt-2">{config.heroSubtitle}</p>
                        {config.aboutText && <p className="text-sm text-gray-300 mt-2 line-clamp-2 max-w-xl hidden md:block">{config.aboutText}</p>}
                     </div>
                </div>
            </div>
        )}

        {/* ADS CAROUSEL (Cinematic / Full Width Style / 2-Up on PC) */}
        {activeAds.length > 0 && !showGatekeeper && (
             <div className="w-full relative group/ads bg-white border-b border-gray-100">
                 <div className="max-w-full mx-auto relative">
                     <button onClick={() => scrollAds('left')} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:scale-110 transition-all text-brand-black opacity-0 group-hover/ads:opacity-100"><ChevronLeft size={24}/></button>
                     <button onClick={() => scrollAds('right')} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:scale-110 transition-all text-brand-black opacity-0 group-hover/ads:opacity-100"><ChevronRight size={24}/></button>
                     
                     <div ref={adsScrollRef} className="flex overflow-x-auto hide-scroll snap-x snap-mandatory scroll-smooth w-full">
                        {activeAds.map(ad => (
                            // Use md:w-1/2 to show 2 ads on medium screens and up
                            <div key={ad.id} onClick={() => handleAdClick(ad)} className="w-full md:w-1/2 shrink-0 snap-center relative h-48 md:h-64 cursor-pointer border-r border-white/10">
                                <img src={ad.imageUrl} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center md:items-start max-w-7xl mx-auto w-full">
                                    <h3 className="text-white font-display font-bold text-2xl md:text-3xl uppercase tracking-wide drop-shadow-md mb-2">{ad.title}</h3>
                                    {(ad.linkToItem || ad.linkToCategory || ad.externalUrl) && (
                                        <span className="bg-brand-yellow text-brand-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transform hover:scale-105 transition-transform">
                                            {ad.externalUrl ? 'Visit Link' : 'Order Now'} <ArrowRight size={12}/>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             </div>
        )}

        {/* --- MENU VIEW --- */}
        {!showGatekeeper && (
            <>
                {/* STICKY NAV ACTION BAR (SCROLLABLE & AUTO-SCROLL) */}
                <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm transition-all">
                    <div className="max-w-7xl mx-auto px-4">
                        <div ref={navContainerRef} className="flex overflow-x-auto hide-scroll gap-6 py-3 snap-x scroll-smooth">
                            {config.enableLandingGatekeeper && <button onClick={() => setShowGatekeeper(true)} className="pr-4 border-r border-gray-100 flex items-center text-gray-400 hover:text-brand-black"><Home size={20}/></button>}
                            {config.categories.map(cat => {
                                const sectionId = getSectionId(cat.name);
                                return (
                                    <button id={`tab-btn-${sectionId}`} key={cat.name} onClick={() => handleTabClick(cat.name)} className={`snap-start whitespace-nowrap font-display font-bold text-lg tracking-wide uppercase transition-colors relative flex items-center gap-1 px-1 ${activeTabId === sectionId ? 'text-brand-black' : 'text-gray-400 hover:text-gray-600'}`}>
                                    {cat.name}
                                    {cat.tag && <span className="text-[9px] text-brand-black px-1.5 py-0.5 rounded-full font-bold ml-1" style={{backgroundColor: cat.tagColor || '#FFCB05'}}>{cat.tag}</span>}
                                    {activeTabId === sectionId && <div className="absolute -bottom-3 left-0 w-full h-1 bg-brand-yellow rounded-t-full" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <main id="menu-section" className="max-w-7xl mx-auto px-4 py-8 space-y-12 flex-1 w-full animate-in fade-in">
                    {config.categories.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            <h3 className="font-bold text-xl mb-2">Menu is empty</h3>
                            <p className="text-sm">Please login to Admin Panel to add categories and items.</p>
                        </div>
                    )}
                    {config.categories.map(cat => {
                        const items = visibleMenuItems.filter(i => i.category === cat.name);
                        if (items.length === 0) return null;
                        const sectionId = getSectionId(cat.name);
                        return (
                        <section key={cat.name} id={sectionId} className="scroll-mt-48">
                            <div className="flex items-center gap-4 mb-6"><h3 className="font-display font-bold text-3xl flex items-center gap-3 flex-1 text-brand-black">{cat.name}<div className="h-1 bg-brand-yellow flex-1 opacity-20 rounded-full"></div></h3></div>
                            <div className="flex overflow-x-auto pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 sm:overflow-visible hide-scroll snap-x">
                            {items.map(item => (
                                <div key={item.id} id={item.id} className={`snap-center shrink-0 w-[280px] sm:w-auto group rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-200 overflow-hidden flex flex-col bg-white ${animatingItems.has(item.id) ? 'animate-bump ring-2 ring-brand-yellow bg-yellow-50' : ''}`}>
                                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"/>
                                    {item.tag && (<div className="absolute top-3 left-3 text-[10px] font-bold px-3 py-1 rounded shadow-md uppercase tracking-wider z-10" style={{backgroundColor: item.tagColor || '#FFCB05', color: 'black'}}>{item.tag}</div>)}
                                    <button onClick={(e) => { e.stopPropagation(); handleShare(item.id); }} className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-brand-black"><Share2 size={16}/></button>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2"><h3 className="font-display font-bold text-xl text-brand-black leading-tight whitespace-normal">{item.name}</h3></div>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1 font-medium whitespace-normal">{item.description}</p>
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="font-display font-bold text-xl text-brand-black">{formatPrice(item.price)}</span>
                                            {item.comboPrice && <span className="text-[10px] text-gray-500 font-bold">Combo: {formatPrice(item.comboPrice)}</span>}
                                        </div>
                                        <button onClick={() => handleItemSelect(item)} className="bg-brand-yellow hover:bg-yellow-400 text-brand-black font-bold text-sm px-6 py-2 rounded transition-all active:scale-95 shadow-sm">Add</button>
                                    </div>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </section>
                        );
                    })}
                </main>
            </>
        )}

        {/* Footer */}
        <footer className="bg-white border-t py-12 text-center text-gray-500 text-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2"><span className="font-bold text-brand-black">© 2024 {config.heroTitle}.</span><span>All rights reserved.</span></div>
            <div className="text-xs text-gray-400 flex items-center gap-2">Powered by Stupiak System<button onClick={() => setIsAdminOpen(true)} className="text-gray-300 hover:text-brand-black transition-colors" aria-label="Admin Login"><Lock size={12} /></button></div>
        </div>
        </footer>
        {/* <MenuAssistant />  DISABLED */}
      </div>

      {/* --- CART DRAWER --- */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        menuItems={menuItems}
        config={config}
        currentOutlet={currentOutlet}
        isBusinessOpen={isBusinessOpen}
        needsCutlery={needsCutlery}
        setNeedsCutlery={setNeedsCutlery}
        handleCheckout={handleCheckout}
        updateCartItemQty={updateCartItemQty}
        onRemoveItem={(uuid) => setCart(prev => prev.filter(i => i.uuid !== uuid))}
        onEditItem={(item) => { 
            const originalItem = menuItems.find(i => i.id === item.menuItemId);
            if(originalItem) {
                handleItemSelect(originalItem);
                setEditingCartItemUuid(item.uuid);
            }
        }}
        onOutletChange={() => { setIsCartOpen(false); setSelectedOutletId(null); }}
      />

      {/* --- FULL SCREEN LEADING FLOW MODAL --- */}
      {/* Unified Logic: Show if flow is active and we have items/steps */}
      {flowActive && flowItem && (
         <FlowModal 
            item={flowItem}
            // If Review Step, force 'Review' step type. Else calculate based on index.
            step={isReviewStep ? 'Review' : (getCurrentFlowSteps()[flowStepIndex] || 'Addon')}
            stepIndex={flowStepIndex}
            totalSteps={getCurrentFlowSteps().length}
            currency={config.currencySymbol}
            onClose={() => setFlowActive(false)}
            onNext={handleFlowNext}
            onBack={handleFlowBack}
            meatCategories={config.meatCategories}
            menuItems={menuItems}
            
            // CRITICAL FIX: Split history selections from current step initial selections
            existingSelections={getHistoryForPrice()} 
            initialSelections={getCurrentStepInitialSelections()}
            
            // Legacy for compatibility (if FlowModal uses it for display)
            currentSelections={[]} // Not used for logic anymore
            
            onTempSelect={setTempFlowSelectedOptions}
            meatFilter={flowMeatFilter}
            openItemCustomization={(itemToEdit) => {
                setSubItemToCustomize(itemToEdit);
                setIsCustomizingSubItem(true);
            }}
            config={config}
            mode={flowMode}
            isCombo={flowMode === 'combo'}
            flowSteps={getCurrentFlowSteps()}
            historySelections={collectAllSelections()} // Full history for Review screen listing
            onJumpToStep={handleJumpToStep}
            isEditingStep={isEditingStep}
         />
      )}

      {/* --- SUB ITEM EDITOR (CUSTOMIZE MODAL) --- */}
      {isCustomizingSubItem && subItemToCustomize && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCustomizingSubItem(false)}/>
               <div className="relative w-full max-w-md h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
                   <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                       <div>
                          <h3 className="font-bold text-lg text-brand-black">Customize</h3>
                          <p className="text-xs text-gray-500">Special instructions for {subItemToCustomize.name}</p>
                       </div>
                       <button onClick={()=>setIsCustomizingSubItem(false)} className="p-2 bg-white rounded-full text-gray-500 hover:text-black shadow-sm"><X size={20}/></button>
                   </div>
                   <div className="flex-1 overflow-y-auto">
                        <FlowModal 
                            item={subItemToCustomize}
                            step="Customization" // Special step name
                            stepIndex={-1}
                            totalSteps={0}
                            currency={config.currencySymbol}
                            onClose={() => setIsCustomizingSubItem(false)}
                            onNext={(opts) => {
                                const extraCost = opts.reduce((s, o) => s + o.price, 0);
                                const combinedName = `${subItemToCustomize.name} ${opts.length > 0 ? '(' + opts.map(o=>o.name).join(', ') + ')' : ''}`;
                                const totalItemPrice = subItemToCustomize.price + extraCost;
                                
                                const newOption: MenuItemOption = {
                                    name: combinedName,
                                    price: totalItemPrice,
                                    type: 'addon',
                                    imageUrl: subItemToCustomize.imageUrl
                                };
                                
                                setTempFlowSelectedOptions(prev => [...prev, newOption]); 
                                setIsCustomizingSubItem(false);
                            }}
                            onBack={() => setIsCustomizingSubItem(false)}
                            meatCategories={[]}
                            menuItems={menuItems}
                            existingSelections={[]}
                            initialSelections={[]}
                            currentSelections={[]}
                            onTempSelect={()=>{}}
                            meatFilter={null}
                            openItemCustomization={()=>{}}
                            config={config}
                            mode="alaCarte"
                            embedded={true}
                        />
                   </div>
               </div>
          </div>
      )}

      {/* --- AD MODAL POPUP --- */}
      {showAdModal && currentPopupAd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAdModal(false)}/>
              <div 
                  className="relative bg-transparent w-full max-w-md animate-in zoom-in-95 group/popup"
              >
                  <button onClick={() => setShowAdModal(false)} className="absolute -top-10 right-0 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><X/></button>
                  <div 
                    className="rounded-2xl overflow-hidden shadow-2xl relative"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                      <div className="relative aspect-[4/5] bg-black">
                          <img src={currentPopupAd.imageUrl} className="w-full h-full object-cover"/>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-6 text-white text-center">
                               <h2 className="font-display font-bold text-3xl uppercase mb-2 drop-shadow-lg">{currentPopupAd.title}</h2>
                               {(currentPopupAd.linkToItem || currentPopupAd.linkToCategory || currentPopupAd.externalUrl) && (
                                   <button 
                                      onClick={() => handleAdClick(currentPopupAd)}
                                      className="bg-brand-yellow text-brand-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide hover:scale-105 transition-transform shadow-lg flex items-center gap-2 mx-auto"
                                   >
                                       {currentPopupAd.externalUrl ? 'Visit Link' : 'Order Now'} <ArrowRight size={14}/>
                                   </button>
                               )}
                          </div>
                          {activeAds.length > 1 && (
                              <>
                                <button onClick={(e) => {e.stopPropagation(); setActiveAdIndex(prev => (prev - 1 + activeAds.length) % activeAds.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm z-10"><ChevronLeft size={24}/></button>
                                <button onClick={(e) => {e.stopPropagation(); setActiveAdIndex(prev => (prev + 1) % activeAds.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm z-10"><ChevronRight size={24}/></button>
                                <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-10">
                                    {activeAds.map((_, idx) => (
                                        <div key={idx} className={`h-1 rounded-full transition-all ${idx === activeAdIndex % activeAds.length ? 'w-4 bg-brand-yellow' : 'w-2 bg-white/50'}`} />
                                    ))}
                                </div>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- ADMIN PANEL --- */}
      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)}
        config={config}
        setConfig={setConfig}
        menuItems={menuItems}
        setMenuItems={setMenuItems}
        outlets={outlets}
        setOutlets={setOutlets}
        onPreviewAd={handlePreviewAd}
      />
    </div>
  );
};

export default App;