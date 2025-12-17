import { MenuItem, AppConfig, Outlet } from './types';

export const DEFAULT_OUTLETS: Outlet[] = [
  {
    id: 'outlet-1',
    name: "Main Outlet",
    address: "123 Food Street",
    phone: "60123456789",
    whatsappNumber: "60123456789",
    isActive: true,
    openingTime: "10:00",
    closingTime: "22:00",
    lat: 1.5533, 
    lng: 110.3592
  }
];

// Helper for placeholder images
const IMG_BASE = "https://placehold.co/600x450/FFCB05/1A1A1A";

export const DEFAULT_CONFIG: AppConfig = {
  logoUrl: "", 
  heroImageUrl: "", 
  heroTitle: "BRAND NAME",
  heroSubtitle: "Delicious Burger & Beverages",
  aboutTitle: "About Us",
  aboutText: "Welcome to our store.",
  aboutPosterUrl: "",
  currencySymbol: 'RM',
  whatsappTemplate: `Hi ({OUTLET})! I'd like to place an order:

{ORDER_LIST}

Total: {TOTAL}
Need Cutlery: {CUTLERY}
Payment Method: Transfer / Cash`,
  
  categories: [], // Cleared
  
  meatCategories: [
      { name: 'Pork', tagColor: '#DB0007' }, 
      { name: 'Beef', tagColor: '#1A1A1A' }, 
      { name: 'Chicken', tagColor: '#FFCB05' }
  ],
  
  isStoreOpen: true,
  adPosters: [],
  
  navigationTabs: [],
  
  viewMode: 'scroll',
  enableLandingGatekeeper: false, 
  
  flowGroups: [],
  
  // --- OPTION GROUPS ---
  optionGroups: [],

  globalAddons: []
};

export const MENU_ITEMS: MenuItem[] = [];

export const GEMINI_SYSTEM_INSTRUCTION = `
You are a crew member for this restaurant. 
Style: Efficient, Fast Food Kiosk style, friendly but concise.
`;