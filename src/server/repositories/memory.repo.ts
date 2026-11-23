import { createSeedDataset } from '../db/seed.ts';
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
import type {
  InventoryRepository,
  InventoryStateSnapshot,
  InventoryTransactionContext,
} from './inventory.repo.ts';

export class MemoryInventoryRepository implements InventoryRepository {
  readonly mode = 'memory' as const;
  private state: InventoryStateSnapshot;
  private poSeq = 116;
  private invSeq = 226;
  private trfSeq = 103;

  constructor(initial?: InventoryStateSnapshot) {
    this.state = initial ? structuredClone(initial) : createSeedDataset();
  }

  async getSnapshot(): Promise<InventoryStateSnapshot> {
    return structuredClone(this.state);
  }

  async getGodowns(): Promise<Godown[]> {
    return structuredClone(this.state.godowns);
  }

  async getSuppliers(): Promise<Supplier[]> {
    return structuredClone(this.state.suppliers);
  }

  async getCustomers(): Promise<Customer[]> {
    return structuredClone(this.state.customers);
  }

  async getItems(): Promise<Item[]> {
    return structuredClone(this.state.items);
  }

  async getItemById(id: string): Promise<Item | null> {
    const found = this.state.items.find((it) => it.id === id);
    return found ? structuredClone(found) : null;
  }

  async getStockLevels(itemId?: string): Promise<StockLevel[]> {
    const list = itemId
      ? this.state.stockLevels.filter((s) => s.itemId === itemId)
      : this.state.stockLevels;
    return structuredClone(list);
  }

  async getStockQty(itemId: string, godownId: string): Promise<number> {
    const found = this.state.stockLevels.find(
      (s) => s.itemId === itemId && s.godownId === godownId,
    );
    return found ? found.qty : 0;
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return structuredClone(this.state.purchaseOrders);
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const found = this.state.purchaseOrders.find((p) => p.id === id);
    return found ? structuredClone(found) : null;
  }

  async getSalesOrders(): Promise<SalesOrder[]> {
    return structuredClone(this.state.salesOrders);
  }

  async getSalesOrderById(id: string): Promise<SalesOrder | null> {
    const found = this.state.salesOrders.find((s) => s.id === id);
    return found ? structuredClone(found) : null;
  }

  async getStockMovements(itemId?: string): Promise<StockMovement[]> {
    const list = itemId
      ? this.state.stockMovements.filter((m) => m.itemId === itemId)
      : this.state.stockMovements;
    return structuredClone(list).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getActivityLogs(limit = 20): Promise<ActivityLog[]> {
    return structuredClone(this.state.activityLogs)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async runTransaction<T>(fn: (tx: InventoryTransactionContext) => Promise<T>): Promise<T> {
    // Atomic snapshot-and-swap guarantees full rollback if any business rule throws
    const draft = structuredClone(this.state);
    let nextPo = this.poSeq;
    let nextInv = this.invSeq;
    let nextTrf = this.trfSeq;

    const tx: InventoryTransactionContext = {
      getGodownById: async (id) => draft.godowns.find((g) => g.id === id) ?? null,
      getSupplierById: async (id) => draft.suppliers.find((s) => s.id === id) ?? null,
      getCustomerById: async (id) => draft.customers.find((c) => c.id === id) ?? null,
      getItemById: async (id) => draft.items.find((i) => i.id === id) ?? null,
      getStockQty: async (itemId, godownId) => {
        const entry = draft.stockLevels.find(
          (s) => s.itemId === itemId && s.godownId === godownId,
        );
        return entry ? entry.qty : 0;
      },
      setStockQty: async (itemId, godownId, qty) => {
        const entry = draft.stockLevels.find(
          (s) => s.itemId === itemId && s.godownId === godownId,
        );
        if (entry) {
          entry.qty = qty;
        } else {
          draft.stockLevels.push({ itemId, godownId, qty });
        }
      },
      getPurchaseOrderById: async (id) =>
        draft.purchaseOrders.find((p) => p.id === id) ?? null,
      savePurchaseOrder: async (po) => {
        const idx = draft.purchaseOrders.findIndex((p) => p.id === po.id);
        if (idx >= 0) {
          draft.purchaseOrders[idx] = structuredClone(po);
        } else {
          draft.purchaseOrders.push(structuredClone(po));
        }
        return structuredClone(po);
      },
      getSalesOrderById: async (id) =>
        draft.salesOrders.find((s) => s.id === id) ?? null,
      saveSalesOrder: async (so) => {
        const idx = draft.salesOrders.findIndex((s) => s.id === so.id);
        if (idx >= 0) {
          draft.salesOrders[idx] = structuredClone(so);
        } else {
          draft.salesOrders.push(structuredClone(so));
        }
        return structuredClone(so);
      },
      appendMovement: async (movement) => {
        draft.stockMovements.push(structuredClone(movement));
      },
      appendActivity: async (activity) => {
        draft.activityLogs.unshift(structuredClone(activity));
      },
      nextPoNumber: async () => `PO-2627-${String(nextPo++).padStart(4, '0')}`,
      nextInvoiceNumber: async () => `INV-2627-${String(nextInv++).padStart(4, '0')}`,
      nextTransferNumber: async () => `TRF-2627-${String(nextTrf++).padStart(4, '0')}`,
    };

    const result = await fn(tx);
    this.state = draft;
    this.poSeq = nextPo;
    this.invSeq = nextInv;
    this.trfSeq = nextTrf;
    return result;
  }

  async resetDemoData(): Promise<void> {
    this.state = createSeedDataset();
    this.poSeq = 116;
    this.invSeq = 226;
    this.trfSeq = 103;
  }
}
