import React, { useState } from 'react';
import { X, MapPin, Edit2, AlertCircle, Trash2, Minus, Plus, Utensils, Check } from 'lucide-react';
import { CartItem, Outlet, AppConfig, MenuItem, MenuItemOption } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  menuItems: MenuItem[];
  config: AppConfig;
  currentOutlet: Outlet | undefined;
  isBusinessOpen: boolean;
  needsCutlery: boolean;
  setNeedsCutlery: (val: boolean) => void;
  handleCheckout: () => void;
  updateCartItemQty: (uuid: string, delta: number) => void;
  onRemoveItem: (uuid: string) => void;
  onEditItem: (item: CartItem) => void;
  onOutletChange: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen, onClose, cart, menuItems, config, currentOutlet, isBusinessOpen, 
  needsCutlery, setNeedsCutlery, handleCheckout, updateCartItemQty, onRemoveItem, onEditItem, onOutletChange
}) => {
  const [deleteConfirmUuid, setDeleteConfirmUuid] = useState<string | null>(null);

  if (!isOpen) return null;

  const cartTotalAmount = cart.reduce((total, item) => total + ((item.price + item.selectedOptions.reduce((acc, opt) => acc + opt.price, 0)) * item.qty), 0);
  const formatPrice = (price: number) => `${config.currencySymbol} ${price.toFixed(2)}`;

  // Helper to group options by name to show "Option x2"
  const getGroupedOptions = (options: MenuItemOption[]) => {
      const grouped: { [key: string]: { name: string, count: number, type: string } } = {};
      options.forEach(o => {
          if (!grouped[o.name]) grouped[o.name] = { name: o.name, count: 0, type: o.type };
          grouped[o.name].count++;
      });
      return Object.values(grouped);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-display font-bold text-2xl text-brand-black">Order Summary</h2>
          <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-brand-black" /></button>
        </div>

        {/* Outlet Info */}
        <div className="p-4 bg-yellow-50 border-b border-yellow-100 relative">
          <h4 className="font-bold text-brand-black text-sm flex items-center gap-2 pr-8"><MapPin size={14}/> {currentOutlet?.name}</h4>
          <p className="text-xs text-gray-600 mt-1 pl-6">{currentOutlet?.address}</p>
          <button onClick={() => { onClose(); onOutletChange(); }} className="absolute top-4 right-4 text-brand-black bg-white/50 p-1.5 rounded-full hover:bg-white border border-transparent hover:border-gray-200 transition-colors"><Edit2 size={12}/></button>
          {!isBusinessOpen && <div className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1"><AlertCircle size={12}/> Store is Closed</div>}
        </div>

        {/* Items */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {cart.length === 0 ? <div className="text-center py-12 text-gray-400">Your cart is empty</div> : cart.map(item => (
            <div key={item.uuid} className="flex gap-4 bg-white p-2 rounded-lg border border-gray-100 relative group">
              <button onClick={() => { onClose(); onEditItem(item); }} className="absolute top-2 right-2 px-2 py-1 bg-gray-100 hover:bg-brand-yellow rounded text-[10px] font-bold text-brand-black uppercase transition-colors">Edit</button>
              <div className="flex-1">
                <div className="flex justify-between font-bold text-brand-black pr-12">
                  <span>{item.name}</span>
                  <span>{formatPrice((item.price + item.selectedOptions.reduce((a, b) => a + b.price, 0)) * item.qty)}</span>
                </div>
                {item.selectedOptions.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                        {getGroupedOptions(item.selectedOptions).map((g, i, arr) => (
                            <span key={g.name}>
                                {g.type === 'preference' ? `NO ${g.name.replace(/^No /i, '')}` : `+ ${g.name}`}
                                {g.count > 1 ? ` (x${g.count})` : ''}
                                {i < arr.length - 1 ? ', ' : ''}
                            </span>
                        ))}
                    </div>
                )}
                {item.isCombo && <span className="text-[9px] bg-brand-black text-brand-yellow px-1 rounded font-bold mt-1 inline-block">COMBO</span>}
                <div className="flex justify-end mt-2 items-center gap-2">
                  
                  {/* Inline Delete Confirmation */}
                  {deleteConfirmUuid === item.uuid ? (
                      <div className="flex items-center gap-1 mr-2 animate-in slide-in-from-right-5 fade-in duration-200">
                          <span className="text-[10px] font-bold text-red-600 mr-1">Sure?</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveItem(item.uuid); setDeleteConfirmUuid(null); }} 
                            className="w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700 shadow-sm"
                          >
                              <Check size={12}/>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmUuid(null); }} 
                            className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                          >
                              <X size={12}/>
                          </button>
                      </div>
                  ) : (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmUuid(item.uuid); }} className="p-1 text-red-400 hover:text-red-600 mr-2 transition-colors">
                          <Trash2 size={12}/>
                      </button>
                  )}

                  <button onClick={() => updateCartItemQty(item.uuid, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-brand-black"><Minus size={12}/></button>
                  <span className="text-sm font-bold w-4 text-center text-brand-black">{item.qty}</span>
                  <button onClick={() => updateCartItemQty(item.uuid, 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-brand-black"><Plus size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border"><span className="flex items-center gap-2 text-sm font-bold text-brand-black"><Utensils size={16}/> Need Cutlery?</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={needsCutlery} onChange={e => setNeedsCutlery(e.target.checked)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-yellow"></div></label></div>
          <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-brand-yellow text-brand-black font-bold text-lg py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-yellow-400 transition-colors">{!isBusinessOpen && <span className="bg-red-500 text-white text-[10px] px-1 rounded">CLOSED</span>}Checkout {config.currencySymbol} {cartTotalAmount.toFixed(2)}</button>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;