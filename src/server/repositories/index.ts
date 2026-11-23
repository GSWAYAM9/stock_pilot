import { hasDatabaseUrl, probePostgresReady } from '../db/client.ts';
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
import { MemoryInventoryRepository } from './memory.repo.ts';
import { PostgresInventoryRepository } from './postgres.repo.ts';

class ResilientInventoryRepository implements InventoryRepository {
  private resolved: InventoryRepository | null = null;
  private resolving: Promise<InventoryRepository> | null = null;

  get mode(): 'memory' | 'postgres' {
    return this.resolved?.mode ?? (hasDatabaseUrl() ? 'postgres' : 'memory');
  }

  private async getActiveRepo(): Promise<InventoryRepository> {
    if (this.resolved) return this.resolved;
    if (!this.resolving) {
      this.resolving = (async () => {
        if (await probePostgresReady()) {
          this.resolved = new PostgresInventoryRepository();
        } else {
          this.resolved = new MemoryInventoryRepository();
        }
        return this.resolved;
      })();
    }
    return this.resolving;
  }

  async getSnapshot(): Promise<InventoryStateSnapshot> {
    return (await this.getActiveRepo()).getSnapshot();
  }

  async getGodowns(): Promise<Godown[]> {
    return (await this.getActiveRepo()).getGodowns();
  }

  async getSuppliers(): Promise<Supplier[]> {
    return (await this.getActiveRepo()).getSuppliers();
  }

  async getCustomers(): Promise<Customer[]> {
    return (await this.getActiveRepo()).getCustomers();
  }

  async getItems(): Promise<Item[]> {
    return (await this.getActiveRepo()).getItems();
  }

  async getItemById(id: string): Promise<Item | null> {
    return (await this.getActiveRepo()).getItemById(id);
  }

  async getStockLevels(itemId?: string): Promise<StockLevel[]> {
    return (await this.getActiveRepo()).getStockLevels(itemId);
  }

  async getStockQty(itemId: string, godownId: string): Promise<number> {
    return (await this.getActiveRepo()).getStockQty(itemId, godownId);
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return (await this.getActiveRepo()).getPurchaseOrders();
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    return (await this.getActiveRepo()).getPurchaseOrderById(id);
  }

  async getSalesOrders(): Promise<SalesOrder[]> {
    return (await this.getActiveRepo()).getSalesOrders();
  }

  async getSalesOrderById(id: string): Promise<SalesOrder | null> {
    return (await this.getActiveRepo()).getSalesOrderById(id);
  }

  async getStockMovements(itemId?: string): Promise<StockMovement[]> {
    return (await this.getActiveRepo()).getStockMovements(itemId);
  }

  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    return (await this.getActiveRepo()).getActivityLogs(limit);
  }

  async runTransaction<T>(fn: (tx: InventoryTransactionContext) => Promise<T>): Promise<T> {
    return (await this.getActiveRepo()).runTransaction(fn);
  }

  async resetDemoData(): Promise<void> {
    return (await this.getActiveRepo()).resetDemoData();
  }
}

let singletonRepo: InventoryRepository | null = null;

export function getInventoryRepository(): InventoryRepository {
  if (!singletonRepo) {
    singletonRepo = new ResilientInventoryRepository();
  }
  return singletonRepo;
}
