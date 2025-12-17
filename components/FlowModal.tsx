import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, CheckCircle, ChevronRight, Sliders, AlertCircle, ShoppingBag, Plus, Minus, Image as ImageIcon } from 'lucide-react';
import { MenuItem, MenuItemOption, AppConfig, LeadingFlowStepType, Category, OptionGroup } from '../types';

interface FlowModalProps {
  item: MenuItem;
  step: LeadingFlowStepType | 'Review';
  stepIndex: number;
  totalSteps: number;
  currency: string;
  onClose: () => void;
  onNext: (selections: MenuItemOption[], specificItem?: MenuItem) => void;
  onBack: () => void;
  meatCategories: Category[];
  menuItems: MenuItem[];
  currentSelections: MenuItemOption[]; // Legacy/Deprecated
  onTempSelect: (opts: MenuItemOption[]) => void;
  meatFilter: string | null;
  openItemCustomization: (item: MenuItem) => void;
  config: AppConfig;
  mode: 'alaCarte' | 'combo';
  isCombo?: boolean;
  embedded?: boolean; 
  isSubEditor?: boolean;
  onSubEditorSave?: (opts: MenuItemOption[]) => void;
  
  // New props for enhanced flow & price fix
  flowSteps?: string[]; 
  historySelections?: MenuItemOption[]; // Full history for display
  existingSelections?: MenuItemOption[]; // Selections from OTHER steps (for base price calc)
  initialSelections?: MenuItemOption[]; // Selections for THIS step (to pre-fill state)
  onJumpToStep?: (index: number) => void;
  isEditingStep?: boolean;
}

const FlowModal: React.FC<FlowModalProps> = ({
  item, step, stepIndex, totalSteps, currency, onClose, onNext, onBack,
  meatCategories, menuItems, currentSelections, onTempSelect, meatFilter,
  openItemCustomization, config, mode, isCombo, embedded, isSubEditor, onSubEditorSave,
  flowSteps = [], historySelections = [], existingSelections = [], initialSelections = [], onJumpToStep, isEditingStep
}) => {
  
  const [localSelections, setLocalSelections] = useState<MenuItemOption[]>(initialSelections);

  // Initialize state when step changes. 
  // IMPORTANT: We do NOT depend on 'initialSelections' directly here to avoid infinite reset loops 
  // when the parent re-renders due to onTempSelect updates.
  useEffect(() => {
      setLocalSelections(initialSelections);
  }, [stepIndex, isEditingStep, item.id]);

  useEffect(() => {
    // PRE-SELECTION LOGIC
    // Only pre-select if it's a required single-choice group and nothing is selected yet
    if (!['Meat', 'Variation', 'Addon', 'Customization', 'Review'].includes(step) && localSelections.length === 0 && initialSelections.length === 0) {
        const group = config.optionGroups?.find(g => g.id === step);
        if(group && group.options.length > 0 && group.isRequired) {
             if(group.maxSelection === 1) {
                 setLocalSelections([group.options[0]]);
             }
        }
    } 
  }, [step, config.optionGroups, localSelections.length, initialSelections.length]);

  useEffect(() => {
    onTempSelect(localSelections);
  }, [localSelections, onTempSelect]);

  // Updated Selection Handler
  const handleSelect = (opt: MenuItemOption, logic: 'toggle' | 'increment' | 'decrement', maxSelection?: number) => {
    
    if (logic === 'toggle') {
        // Standard Binary Selection
        if (maxSelection === 1) {
            // Single Choice: Replace
            setLocalSelections([opt]);
        } else {
            // Multi Choice: Toggle
            const exists = localSelections.some(s => s.name === opt.name);
            if (exists) {
                setLocalSelections(prev => prev.filter(s => s.name !== opt.name));
            } else {
                // Check Max Limit
                if (maxSelection && maxSelection > 0 && localSelections.length >= maxSelection) {
                    return; // Max limit reached
                }
                setLocalSelections(prev => [...prev, opt]);
            }
        }
    } else if (logic === 'increment') {
        // Quantity Logic: Add another instance
        if (maxSelection && maxSelection > 0 && localSelections.length >= maxSelection) {
            return; // Max limit reached
        }
        setLocalSelections(prev => [...prev, opt]);
    } else if (logic === 'decrement') {
        // Quantity Logic: Remove one instance
        const index = localSelections.findIndex(s => s.name === opt.name);
        if (index !== -1) {
            const newArr = [...localSelections];
            newArr.splice(index, 1);
            setLocalSelections(newArr);
        }
    }
  };

  const getOptionCount = (optName: string) => {
      return localSelections.filter(s => s.name === optName).length;
  };

  const calculateTotal = () => {
    // Detect combo trigger in current selections or history to dynamically update base price
    const hasComboTrigger = localSelections.some(o => o.isComboTrigger) || existingSelections.some(o => o.isComboTrigger);
    
    // Use combo price if explicitly in combo mode OR if a trigger is selected
    const effectiveIsCombo = isCombo || hasComboTrigger;
    
    const base = (effectiveIsCombo && item.comboPrice !== undefined) ? item.comboPrice : item.price;
    
    // Sum options
    const prevOpts = existingSelections.reduce((a, b) => a + b.price, 0); 
    const currOpts = localSelections.reduce((a, b) => a + b.price, 0);
    return base + prevOpts + currOpts;
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "";
    return `${currency} ${price.toFixed(2)}`;
  };

  const getCurrentStepName = () => {
      if (step === 'Meat') return 'Choose Meat';
      if (step === 'Variation') return 'Select Burger';
      if (step === 'Customization') return 'Customize';
      if (step === 'Review') return 'Confirm Order';
      const group = config.optionGroups?.find(g => g.id === step);
      if (group) return group.name;
      return step;
  };

  const renderContent = () => {
    // 0. REVIEW PAGE (Item Detail / Summary)
    if (step === 'Review') {
        // Find customizable ingredients for the main button
        const canCustomize = item.linkedOptionGroupIds?.some(gid => config.optionGroups?.find(g => g.id === gid && g.isCustomization));
        
        return (
            <div className="pt-2 pb-24">
                {/* Hero Product View (Item Header) */}
                <div className="flex gap-4 items-center bg-white p-4 mb-1">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-display font-bold text-lg text-brand-black leading-tight uppercase">{item.name}</h2>
                        {canCustomize && (
                            <button onClick={() => openItemCustomization(item)} className="text-sm text-blue-600 font-bold mt-1">Customize</button>
                        )}
                    </div>
                </div>

                {/* Steps List (Pic 2 Style) */}
                <div className="bg-white divide-y divide-gray-100 border-t border-b border-gray-100">
                    {flowSteps.map((stepId, index) => {
                        if (stepId === 'Meat') return null; // Usually implied by item
                        if (stepId === 'Variation') return null; // The item itself

                        const group = config.optionGroups?.find(g => g.id === stepId);
                        if (!group) return null; // Should not happen
                        if (group.isCustomization) return null; // Handled by "Customize" button

                        // Find selections for this step from FULL history
                        const selectionsForGroup = historySelections.filter(sel => group.options.some(opt => opt.name === sel.name));
                        
                        const hasSelection = selectionsForGroup.length > 0;
                        const displaySelection = hasSelection 
                            ? selectionsForGroup.map(s => s.name).join(', ') 
                            : (group.isRequired ? 'Required' : 'No Thanks'); // Default text

                        // Try to find image from selection, or 'No Thanks' option image, or fallback
                        const displayImage = hasSelection && selectionsForGroup[0].imageUrl 
                            ? selectionsForGroup[0].imageUrl 
                            : (group.options.find(o=>o.name === 'No Thanks' || o.name === 'None')?.imageUrl);

                        return (
                            <div key={stepId} className="flex items-center justify-between p-4 py-6">
                                <div className="flex items-center gap-4">
                                    {/* Icon / Image for Step */}
                                    <div className="w-12 h-12 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {displayImage ? (
                                            <img src={displayImage} className="w-full h-full object-cover"/>
                                        ) : (
                                            hasSelection ? <CheckCircle size={20} className="text-green-500"/> : <span className="text-[10px] text-gray-400 font-bold text-center leading-tight p-1">{group.name}</span>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <div className="font-bold text-brand-black text-sm">{group.name}</div>
                                        <div className="text-sm text-gray-600 font-medium mt-0.5">{displaySelection}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onJumpToStep && onJumpToStep(index)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-brand-black hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                >
                                    Change
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 1. Meat Selection
    if (step === 'Meat') {
      return (
        <div className="grid grid-cols-1 gap-6 pt-4">
          {meatCategories.map(cat => {
            const isSelected = localSelections.some(s => s.name === cat.name);
            const bgColor = cat.tagColor || '#1A1A1A';
            return (
              <button
                key={cat.name}
                onClick={() => handleSelect({ name: cat.name, price: 0, type: 'preference' }, 'toggle', 1)}
                className={`
                  relative h-56 rounded-3xl overflow-hidden transition-all duration-300 transform text-left w-full group
                  ${isSelected
                    ? 'ring-[6px] ring-brand-yellow shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] scale-[1.02] z-10'
                    : 'hover:scale-[1.02] hover:shadow-xl opacity-90 hover:opacity-100 shadow-md'
                  }
                `}
              >
                <div className="absolute inset-0 transition-opacity" style={{ backgroundColor: bgColor }}></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-20">
                  <span className="font-display font-black text-9xl text-black select-none translate-y-4 scale-150">{cat.name.charAt(0)}</span>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
                  <div className="bg-white px-6 py-3 rounded-2xl shadow-lg">
                      <span className="font-display font-black text-3xl text-brand-black uppercase tracking-wide text-center block">{cat.name}</span>
                  </div>
                  {isSelected && (
                    <div className="mt-4 bg-brand-yellow text-brand-black px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-2xl animate-in zoom-in slide-in-from-bottom-2">
                      <CheckCircle size={18} strokeWidth={3} />
                      <span className="tracking-wider text-sm">SELECTED</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )
    }

    // 2. Variation Selection
    if (step === 'Variation') {
      const variations = menuItems.filter(i =>
        i.category === item.category &&
        (meatFilter ? i.meatType === meatFilter : true) &&
        i.id !== item.id
      );

      return (
        <div className="grid grid-cols-1 gap-4 pt-2">
           <div 
             onClick={() => onNext([], item)}
             className="p-4 bg-white border-2 border-brand-yellow rounded-2xl shadow-lg relative overflow-hidden cursor-pointer group active:scale-[0.99] transition-transform"
           >
              <div className="flex gap-4 items-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-sm"><img src={item.imageUrl} className="w-full h-full object-cover" /></div>
                  <div className="flex-1">
                      <h4 className="font-display font-bold text-xl text-brand-black leading-tight">{item.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 mb-2 font-medium">{item.description}</p>
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-brand-black bg-brand-yellow px-3 py-1 rounded text-sm shadow-sm">{formatPrice(item.price)}</span>
                         <div className="flex items-center gap-1 text-[10px] bg-black text-white px-2 py-1 rounded-full"><CheckCircle size={10}/> Selected</div>
                      </div>
                  </div>
                  <div className="text-brand-yellow pr-2">
                      <ChevronRight size={28} strokeWidth={3}/>
                  </div>
              </div>
           </div>

           {variations.length > 0 && <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 px-1">Other Options</div>}
           {variations.map(vItem => (
            <button key={vItem.id} onClick={() => onNext([], vItem)} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all text-left group active:scale-95 opacity-80 hover:opacity-100">
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0"><img src={vItem.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" /></div>
              <div className="flex-1">
                <h4 className="font-display font-bold text-lg text-brand-black leading-tight">{vItem.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs group-hover:bg-brand-yellow group-hover:text-black transition-colors">{formatPrice(vItem.price)}</span>
                </div>
              </div>
              <div className="self-center px-4 py-2 text-xs font-bold text-gray-400 border rounded-full group-hover:border-brand-black group-hover:text-brand-black transition-all">Switch</div>
            </button>
          ))}
        </div>
      )
    }

    // 3. SPECIAL HANDLING: CUSTOMIZATION MODAL
    if (step === 'Customization') {
        const customGroups = item.linkedOptionGroupIds
             ?.map(gid => config.optionGroups?.find(g => g.id === gid))
             .filter(g => g && g.isCustomization) as OptionGroup[] || [];
        
        if(customGroups.length === 0) return <div className="text-center py-10 text-gray-400">No customization available.</div>;

        return (
            <div className="space-y-6 pt-2">
                {customGroups.map(group => (
                    <div key={group.id}>
                        <h4 className="font-bold text-lg mb-3 text-brand-black">{group.name}</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {group.options.map((opt, i) => {
                                const count = getOptionCount(opt.name);
                                const isSelected = count > 0;
                                const allowQty = group.allowQuantity ?? false;
                                
                                return (
                                    <div 
                                        key={i}
                                        onClick={() => {
                                            if(!allowQty) handleSelect(opt, 'toggle', group.maxSelection);
                                        }}
                                        className={`
                                            flex items-center justify-between p-3 rounded-lg border transition-all
                                            ${isSelected ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
                                            ${allowQty ? '' : 'cursor-pointer'}
                                        `}
                                    >
                                        <div className="text-left flex-1">
                                            <div className="font-bold text-sm text-brand-black">{opt.name}</div>
                                            {opt.price > 0 && <div className="text-xs text-gray-500">+{formatPrice(opt.price)}</div>}
                                        </div>
                                        
                                        {allowQty ? (
                                            <div className="flex items-center gap-0 bg-white rounded-lg border border-brand-black/20 p-1 shadow-sm h-10" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => handleSelect(opt, 'decrement', group.maxSelection)}
                                                    className={`w-10 h-full flex items-center justify-center rounded-l-md ${count > 0 ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-gray-300'}`}
                                                    disabled={count === 0}
                                                >
                                                    <Minus size={18} strokeWidth={3}/>
                                                </button>
                                                <div className="w-10 h-full flex items-center justify-center font-display font-bold text-lg bg-white text-black border-x border-gray-100">
                                                    {count}
                                                </div>
                                                <button 
                                                    onClick={() => handleSelect(opt, 'increment', group.maxSelection)}
                                                    className={`w-10 h-full flex items-center justify-center rounded-r-md bg-brand-black text-white hover:bg-gray-800`}
                                                    disabled={group.maxSelection ? localSelections.length >= group.maxSelection : false}
                                                >
                                                    <Plus size={18} strokeWidth={3}/>
                                                </button>
                                            </div>
                                        ) : (
                                            isSelected && <CheckCircle size={24} className="text-brand-yellow fill-brand-black"/>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // 4. Standard Option Groups (Dynamic by ID)
    let optionsToRender: MenuItemOption[] = [];
    let isSingleSelect = false;
    let allowQty = false;
    let maxGroupSelection: number | undefined = undefined;

    if (step === 'Addon') {
        // Fallback addon step
        optionsToRender = [
            ...(item.options || []), 
            ...(item.linkedOptionGroupIds?.flatMap(id => config.optionGroups?.find(g => g.id === id)?.options || []) || [])
        ].filter(o => o.type === 'addon');
        isSingleSelect = false;
        allowQty = false;
    } else {
        const group = config.optionGroups?.find(g => g.id === step);
        if (group) {
            optionsToRender = group.options;
            isSingleSelect = group.maxSelection === 1;
            allowQty = group.allowQuantity ?? false;
            maxGroupSelection = group.maxSelection;
        }
    }

    if (optionsToRender.length > 0) {
        return (
            <div className="space-y-4 pt-2">
                {optionsToRender.map((opt, i) => {
                    const count = getOptionCount(opt.name);
                    const isSelected = count > 0;
                    
                    return (
                        <div 
                            key={i} 
                            onClick={() => {
                                if(!allowQty) handleSelect(opt, 'toggle', maxGroupSelection);
                            }}
                            className={`
                                w-full p-3 rounded-2xl border-2 flex items-stretch justify-between transition-all duration-200 text-left group overflow-hidden
                                ${isSelected 
                                    ? 'border-brand-yellow bg-yellow-50/50 shadow-md' 
                                    : 'border-transparent bg-white shadow-sm hover:border-gray-200'
                                }
                                ${!allowQty ? 'cursor-pointer' : ''}
                            `}
                        >
                            <div className="flex items-center gap-5 flex-1">
                                {opt.imageUrl ? (
                                    <div className="w-32 h-32 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100 relative shadow-inner">
                                        <img src={opt.imageUrl} className="w-full h-full object-cover"/>
                                    </div>
                                ) : (
                                    <div className="w-32 h-32 rounded-xl bg-gray-50 shrink-0 flex items-center justify-center border border-gray-100">
                                        {/* Icon or Placeholder */}
                                        <div className="w-8 h-8 rounded-full bg-gray-200"/>
                                    </div>
                                )}
                                <div className="flex-1 py-1">
                                    <h4 className={`font-bold text-lg leading-tight ${isSelected ? 'text-brand-black' : 'text-brand-black'}`}>{opt.name}</h4>
                                    {opt.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2 font-medium leading-relaxed">{opt.description}</p>}
                                    {opt.tag && <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide bg-brand-red text-white shadow-sm">{opt.tag}</span>}
                                </div>
                            </div>

                            <div className="flex flex-col items-end justify-center gap-1 ml-3 pl-3 border-l border-gray-100 border-dashed min-w-[80px]">
                                {opt.price > 0 ? (
                                    <span className="text-sm font-bold text-brand-black bg-white px-2 py-1 rounded shadow-sm border border-gray-100 whitespace-nowrap">+{formatPrice(opt.price)}</span>
                                ) : (
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Free</span>
                                )}
                                <div className="mt-2">
                                    {allowQty ? (
                                        // UPDATED QUANTITY SELECTOR (Pic 4)
                                        <div className="flex items-center gap-0 bg-white rounded-lg border border-brand-black/20 p-1 shadow-sm h-10" onClick={e => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleSelect(opt, 'decrement', maxGroupSelection)}
                                                className={`w-10 h-full flex items-center justify-center rounded-l-md ${count > 0 ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-gray-300'}`}
                                                disabled={count === 0}
                                            >
                                                <Minus size={18} strokeWidth={3}/>
                                            </button>
                                            <div className="w-10 h-full flex items-center justify-center font-display font-bold text-lg bg-white text-black border-x border-gray-100">
                                                {count}
                                            </div>
                                            <button 
                                                onClick={() => handleSelect(opt, 'increment', maxGroupSelection)}
                                                className={`w-10 h-full flex items-center justify-center rounded-r-md bg-brand-black text-white hover:bg-gray-800`}
                                                disabled={maxGroupSelection ? localSelections.length >= maxGroupSelection : false}
                                            >
                                                <Plus size={18} strokeWidth={3}/>
                                            </button>
                                        </div>
                                    ) : (
                                        isSelected ? (
                                            <CheckCircle className="text-brand-yellow fill-brand-black" size={28} />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full border-2 border-gray-300 group-hover:border-gray-400 bg-white" />
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {optionsToRender.length === 0 && <div className="text-center text-gray-400 italic py-10">No options available</div>}
            </div>
        );
    }
    
    return null;
  };

  if (embedded) {
    return (
      <div className="p-4 pb-32">
        {renderContent()}
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <button onClick={() => onNext(localSelections)} className="w-full bg-brand-black text-brand-yellow font-bold text-lg py-4 rounded-xl shadow-lg">
            Save Changes {formatPrice(calculateTotal())}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-in slide-in-from-bottom-5">
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          {!isSubEditor && step !== 'Review' && !isEditingStep && <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"><ArrowLeft size={24} /></button>}
          {(step === 'Review' || isEditingStep) && <span className="p-2 -ml-2 text-brand-black"><ShoppingBag size={24}/></span>}
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-brand-black uppercase text-sm tracking-wide">
            {getCurrentStepName()}
          </span>
          {!isSubEditor && totalSteps > 0 && step !== 'Customization' && step !== 'Review' && !isEditingStep && (
            <div className="flex gap-1 mt-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i <= stepIndex ? 'w-4 bg-brand-yellow' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-600"><X size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {step === 'Variation' && (
            <div className="mb-6 text-center">
              <h2 className="font-display font-bold text-3xl uppercase text-brand-black">Select {meatFilter} Burger</h2>
              <div className="h-1 w-12 bg-brand-yellow mx-auto rounded-full mt-2"></div>
            </div>
          )}
          {renderContent()}
        </div>
      </div>

      {step !== 'Variation' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            {step !== 'Customization' && (
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total</div>
                <div className="font-display font-bold text-2xl text-brand-black">{formatPrice(calculateTotal())}</div>
              </div>
            )}
            <button
              onClick={() => onNext(localSelections)}
              disabled={
                 (step === 'Meat' && localSelections.length === 0) || 
                 (step !== 'Customization' && step !== 'Review' && !isEditingStep && config.optionGroups?.find(g => g.id === step)?.isRequired && localSelections.length === 0)
              }
              className="bg-brand-black text-brand-yellow font-bold text-lg px-8 py-3 rounded-xl shadow-lg hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full justify-center"
            >
              <span>{step === 'Review' ? 'Add to Order' : (isEditingStep ? 'Save Changes' : 'Continue')}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowModal;