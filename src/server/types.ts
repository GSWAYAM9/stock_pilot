import type { ItemCategory } from '../lib/constants.ts';
import type { GstSlab, StockStatus } from '../lib/format.ts';

export interface Godown {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  manager: string;
  capacityUnits: number;
}

export interface Item {
  id: string;
  sku: string;
  hsnCode: string;
  name: string;
  category: ItemCategory;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  gstRate: GstSlab;
  minLevel: number;
  preferredSupplierId: string;
}

export interface StockLevel {
  itemId: string;
  godownId: string;
  qty: number;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
  leadTimeDays: number;
}

export type PurchaseOrderStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  qty: number;
  unitCost: number;
  gstRate: GstSlab;
  taxableAmount: number;
  gstAmount: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  godownId: string;
  godownName: string;
  orderDate: string;
  expectedDate: string;
  receivedDate: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  gstTotal: number;
  grandTotal: number;
  notes: string;
  lines: PurchaseOrderLine[];
}

export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface SalesOrderLine {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  gstRate: GstSlab;
  taxableAmount: number;
  gstAmount: number;
  lineTotal: number;
}

export interface SalesOrder {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  godownId: string;
  godownName: string;
  orderDate: string;
  fulfilledDate: string | null;
  cancelledDate: string | null;
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  gstTotal: number;
  grandTotal: number;
  notes: string;
  lines: SalesOrderLine[];
}

export type MovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'SALE_CANCEL_REVERSAL'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  godownId: string;
  godownName: string;
  type: MovementType;
  qtyDelta: number;
  balanceAfter: number;
  referenceType: 'PO' | 'SO' | 'TRANSFER' | 'ADJUSTMENT';
  referenceId: string;
  referenceNumber: string;
  reason: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  type: 'PURCHASE_RECEIVED' | 'PO_CREATED' | 'SALE_FULFILLED' | 'SALE_CREATED' | 'SALE_CANCELLED' | 'TRANSFER' | 'ADJUSTMENT' | 'DEMO_RESET';
  title: string;
  description: string;
  referenceType?: 'PO' | 'SO' | 'ITEM' | 'GODOWN';
  referenceId?: string;
  createdAt: string;
}

export interface ItemWithStock extends Item {
  totalQty: number;
  stockValue: number;
  status: StockStatus;
  godownBreakdown: Array<{
    godownId: string;
    godownName: string;
    godownCode: string;
    qty: number;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
  };
}

export interface DashboardData {
  kpis: {
    totalStockValue: { value: number; deltaPct: number; sparkline: number[] };
    totalItems: { value: number; deltaPct: number; sparkline: number[]; totalUnits: number };
    lowStockCount: { value: number; outOfStockCount: number; deltaPct: number; sparkline: number[] };
    salesThisMonth: { value: number; deltaPct: number; sparkline: number[]; orderCount: number };
    pendingPurchases: { value: number; count: number; deltaPct: number; sparkline: number[] };
  };
  salesVsPurchases: Array<{
    date: string;
    label: string;
    sales: number;
    purchases: number;
  }>;
  lowStockAlerts: Array<{
    itemId: string;
    sku: string;
    name: string;
    category: ItemCategory;
    unit: string;
    currentQty: number;
    minLevel: number;
    suggestedOrderQty: number;
    costPrice: number;
    gstRate: GstSlab;
    preferredSupplierId: string;
    status: StockStatus;
  }>;
  recentActivity: ActivityLog[];
  topSellingItems: Array<{
    itemId: string;
    sku: string;
    name: string;
    category: ItemCategory;
    unitsSold: number;
    revenue: number;
  }>;
  stockByCategory: Array<{
    category: ItemCategory;
    value: number;
    units: number;
    skuCount: number;
  }>;
}
