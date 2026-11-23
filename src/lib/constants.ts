export const ITEM_CATEGORIES = [
  'Cables & Wires',
  'Switchgear & Protection',
  'Industrial Lighting',
  'Tools & Instruments',
  'Enclosures & Accessories',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<ItemCategory, string> = {
  'Cables & Wires': '#4f46e5',
  'Switchgear & Protection': '#0ea5e9',
  'Industrial Lighting': '#10b981',
  'Tools & Instruments': '#f59e0b',
  'Enclosures & Accessories': '#8b5cf6',
};

export const GST_SLABS = [5, 12, 18] as const;

export type AppModuleId =
  | 'dashboard'
  | 'sales'
  | 'purchases'
  | 'stock'
  | 'reports'
  | 'godowns'
  | 'customers'
  | 'suppliers';

export interface NavItem {
  id: AppModuleId;
  label: string;
  group: 'Operations' | 'Inventory' | 'Directory';
  shortcut: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Operations', shortcut: 'G D' },
  { id: 'sales', label: 'Sales', group: 'Operations', shortcut: 'G S' },
  { id: 'purchases', label: 'Purchases', group: 'Operations', shortcut: 'G P' },
  { id: 'stock', label: 'Stock', group: 'Inventory', shortcut: 'G I' },
  { id: 'godowns', label: 'Godowns', group: 'Inventory', shortcut: 'G W' },
  { id: 'reports', label: 'Reports', group: 'Inventory', shortcut: 'G R' },
  { id: 'customers', label: 'Customers', group: 'Directory', shortcut: 'G C' },
  { id: 'suppliers', label: 'Suppliers', group: 'Directory', shortcut: 'G V' },
];
