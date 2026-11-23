import type {
  ActivityLog,
  Customer,
  Godown,
  Item,
  PurchaseOrder,
  SalesOrder,
  StockLevel,
  StockMovement,
  Supplier,
} from '../types.ts';

export interface InventoryStateSnapshot {
  godowns: Godown[];
  suppliers: Supplier[];
  customers: Customer[];
  items: Item[];
  stockLevels: StockLevel[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  stockMovements: StockMovement[];
  activityLogs: ActivityLog[];
}

export interface InventoryRepository {
  readonly mode: 'memory' | 'postgres';
  getSnapshot(): Promise<InventoryStateSnapshot>;
  getGodowns(): Promise<Godown[]>;
  getSuppliers(): Promise<Supplier[]>;
  getCustomers(): Promise<Customer[]>;
  getItems(): Promise<Item[]>;
  getItemById(id: string): Promise<Item | null>;
  getStockLevels(itemId?: string): Promise<StockLevel[]>;
  getStockQty(itemId: string, godownId: string): Promise<number>;
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderById(id: string): Promise<PurchaseOrder | null>;
  getSalesOrders(): Promise<SalesOrder[]>;
  getSalesOrderById(id: string): Promise<SalesOrder | null>;
  getStockMovements(itemId?: string): Promise<StockMovement[]>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;

  /**
   * Executes a multi-step business mutation atomically (all-or-nothing).
   * In MemoryRepository, clones state on entry and commits only if fn succeeds.
   * In PostgresRepository, runs inside a real SQL transaction.
   */
  runTransaction<T>(fn: (tx: InventoryTransactionContext) => Promise<T>): Promise<T>;

  resetDemoData(): Promise<void>;
}

export interface InventoryTransactionContext {
  getGodownById(id: string): Promise<Godown | null>;
  getSupplierById(id: string): Promise<Supplier | null>;
  getCustomerById(id: string): Promise<Customer | null>;
  getItemById(id: string): Promise<Item | null>;
  getStockQty(itemId: string, godownId: string): Promise<number>;
  setStockQty(itemId: string, godownId: string, qty: number): Promise<void>;
  getPurchaseOrderById(id: string): Promise<PurchaseOrder | null>;
  savePurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder>;
  getSalesOrderById(id: string): Promise<SalesOrder | null>;
  saveSalesOrder(so: SalesOrder): Promise<SalesOrder>;
  appendMovement(movement: StockMovement): Promise<void>;
  appendActivity(activity: ActivityLog): Promise<void>;
  nextPoNumber(): Promise<string>;
  nextInvoiceNumber(): Promise<string>;
  nextTransferNumber(): Promise<string>;
}
