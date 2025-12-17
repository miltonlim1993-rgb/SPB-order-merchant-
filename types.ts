
export interface MenuItemOption {
  name: string;
  price: number;
  type: 'addon' | 'preference';
  imageUrl?: string;
  description?: string; // New: Description for the option
  tag?: string; 
  tagColor?: string; 
  textColor?: string;
  isComboTrigger?: boolean; // New: If true, selecting this switches flow to 'combo' mode
}

export interface OptionGroup {
  id: string;
  name: string;
  options: MenuItemOption[];
  isRequired?: boolean;
  maxSelection?: number; // 0 or undefined means unlimited
  displayMode?: 'both' | 'combo' | 'alaCarte'; 
  isCustomization?: boolean; // New: If true, this group appears in the "Customize" modal, not the main flow steps.
  allowQuantity?: boolean; // New: If true, user can select multiple of the same option (up to maxSelection)
}

export interface MenuItem {
  id: string;
  code?: string;
  name: string;
  price: number;
  comboPrice?: number; 
  comboImageUrl?: string; 
  description: string;
  category: string; 
  meatType: string; 
  tag?: string;
  tagColor?: string; 
  imageUrl: string;
  options?: MenuItemOption[]; // Flattened options for frontend compatibility
  linkedOptionGroupIds?: string[]; // IDs of OptionGroups linked to this item, in ORDER
  isHidden?: boolean; 
  
  // New Availability Flags (Visual/Metadata)
  availableDelivery?: boolean;
  availablePickup?: boolean;
  availableScheduled?: boolean; // Fixed: Separated from Pickup
  availableDineIn?: boolean;
  availabilitySchedule?: string; // e.g., "All opening hours"
  
  // Multi-outlet configuration
  availabilityOutlets?: string[]; // IDs of outlets where this item is available. If undefined/empty, available everywhere.
}

export interface CartItem {
  uuid: string;
  menuItemId: string;
  name: string;
  price: number;
  selectedOptions: MenuItemOption[];
  qty: number;
  isCombo?: boolean; 
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsappNumber: string; 
  isActive: boolean;
  openingTime: string; 
  closingTime: string;
  lat?: number; 
  lng?: number; 
}

export interface AdPoster {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  linkToItem?: string; 
  linkToCategory?: string; // New: Link to category
  externalUrl?: string; // New: Link to external URL
  startTime?: string; // ISO string or HH:mm
  endTime?: string;   // ISO string or HH:mm
}

export interface Category {
  name: string;
  tag?: string; 
  tagColor?: string;
  defaultOptions?: MenuItemOption[]; 
}

export interface NavigationTab {
  id: string;
  label: string;
  tag?: string;
  type: 'category' | 'meat';
  target: string; 
  imageUrl?: string; 
}

export type LeadingFlowStepType = 'Meat' | 'Variation' | 'Addon' | string;

export interface FlowGroup {
  id: string;
  name: string;
  triggers: string[]; 
  enableComboOption: boolean; 
  alaCarteSteps: LeadingFlowStepType[]; 
  comboSteps: LeadingFlowStepType[]; 
}

export interface AppConfig {
  logoUrl: string;
  heroImageUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  aboutPosterUrl?: string; 
  currencySymbol: string;
  whatsappTemplate: string;
  categories: Category[]; 
  meatCategories: Category[]; 
  isStoreOpen: boolean; 
  adPosters: AdPoster[]; 
  navigationTabs: NavigationTab[]; 
  viewMode: 'scroll' | 'kiosk'; 
  
  enableLandingGatekeeper: boolean; 
  flowGroups: FlowGroup[];
  
  // New Option Groups Structure
  optionGroups: OptionGroup[];
  globalAddons: MenuItemOption[]; // Kept for backward compatibility if needed
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  sources?: any[];
}

export interface DateOption {
  date: string;
  day: string;
  available: boolean;
}