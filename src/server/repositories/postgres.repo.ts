import { and, desc, eq } from 'drizzle-orm';
import type { ItemCategory } from '../../lib/constants.ts';
import type { GstSlab } from '../../lib/format.ts';
import { getPgDb } from '../db/client.ts';
import * as schema from '../db/schema.ts';
import { createSeedDataset } from '../db/seed.ts';
import type {
  ActivityLog,
  Customer,
  Godown,
  Item,
  MovementType,
  PaymentStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  SalesOrder,
  SalesOrderStatus,
  StockLevel,
  StockMovement,
  Supplier,
} from '../types.ts';
import type {
  InventoryRepository,
  InventoryStateSnapshot,
  InventoryTransactionContext,
} from './inventory.repo.ts';

function toNum(v: string | number): number {
  return typeof v === 'number' ? v : Number.parseFloat(v);
}

export class PostgresInventoryRepository implements InventoryRepository {
  readonly mode = 'postgres' as const;
  private seededChecked = false;
  private seedingPromise: Promise<void> | null = null;

  private async ensureSeeded(): Promise<void> {
    if (this.seededChecked) return;
    if (!this.seedingPromise) {
      this.seedingPromise = (async () => {
        const db = getPgDb();
        const existing = await db.select({ id: schema.godowns.id }).from(schema.godowns).limit(1);
        if (existing.length === 0) {
          await this.resetDemoData();
        }
        this.seededChecked = true;
      })().finally(() => {
        this.seedingPromise = null;
      });
    }
    return this.seedingPromise;
  }

  async getSnapshot(): Promise<InventoryStateSnapshot> {
    const [
      godowns,
      suppliers,
      customers,
      items,
      stockLevels,
      purchaseOrders,
      salesOrders,
      stockMovements,
      activityLogs,
    ] = await Promise.all([
      this.getGodowns(),
      this.getSuppliers(),
      this.getCustomers(),
      this.getItems(),
      this.getStockLevels(),
      this.getPurchaseOrders(),
      this.getSalesOrders(),
      this.getStockMovements(),
      this.getActivityLogs(50),
    ]);
    return {
      godowns,
      suppliers,
      customers,
      items,
      stockLevels,
      purchaseOrders,
      salesOrders,
      stockMovements,
      activityLogs,
    };
  }

  async getGodowns(): Promise<Godown[]> {
    await this.ensureSeeded();
    return getPgDb().select().from(schema.godowns);
  }

  async getSuppliers(): Promise<Supplier[]> {
    await this.ensureSeeded();
    return getPgDb().select().from(schema.suppliers);
  }

  async getCustomers(): Promise<Customer[]> {
    await this.ensureSeeded();
    return getPgDb().select().from(schema.customers);
  }

  async getItems(): Promise<Item[]> {
    await this.ensureSeeded();
    const rows = await getPgDb().select().from(schema.items);
    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      hsnCode: r.hsnCode,
      name: r.name,
      category: r.category as ItemCategory,
      unit: r.unit,
      costPrice: toNum(r.costPrice),
      sellingPrice: toNum(r.sellingPrice),
      gstRate: r.gstRate as GstSlab,
      minLevel: r.minLevel,
      preferredSupplierId: r.preferredSupplierId,
    }));
  }

  async getItemById(id: string): Promise<Item | null> {
    await this.ensureSeeded();
    const rows = await getPgDb().select().from(schema.items).where(eq(schema.items.id, id)).limit(1);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      sku: r.sku,
      hsnCode: r.hsnCode,
      name: r.name,
      category: r.category as ItemCategory,
      unit: r.unit,
      costPrice: toNum(r.costPrice),
      sellingPrice: toNum(r.sellingPrice),
      gstRate: r.gstRate as GstSlab,
      minLevel: r.minLevel,
      preferredSupplierId: r.preferredSupplierId,
    };
  }

  async getStockLevels(itemId?: string): Promise<StockLevel[]> {
    await this.ensureSeeded();
    const db = getPgDb();
    return itemId
      ? db.select().from(schema.stockLevels).where(eq(schema.stockLevels.itemId, itemId))
      : db.select().from(schema.stockLevels);
  }

  async getStockQty(itemId: string, godownId: string): Promise<number> {
    await this.ensureSeeded();
    const rows = await getPgDb()
      .select()
      .from(schema.stockLevels)
      .where(and(eq(schema.stockLevels.itemId, itemId), eq(schema.stockLevels.godownId, godownId)))
      .limit(1);
    return rows[0]?.qty ?? 0;
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    await this.ensureSeeded();
    const db = getPgDb();
    const [pos, lines, sups, gds, itms] = await Promise.all([
      db.select().from(schema.purchaseOrders).orderBy(desc(schema.purchaseOrders.orderDate)),
      db.select().from(schema.purchaseOrderLines),
      db.select().from(schema.suppliers),
      db.select().from(schema.godowns),
      db.select().from(schema.items),
    ]);
    const supMap = new Map(sups.map((s) => [s.id, s.name]));
    const gdMap = new Map(gds.map((g) => [g.id, g.name]));
    const itemMap = new Map(itms.map((i) => [i.id, i]));

    return pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: supMap.get(po.supplierId) ?? po.supplierId,
      godownId: po.godownId,
      godownName: gdMap.get(po.godownId) ?? po.godownId,
      orderDate: po.orderDate.toISOString(),
      expectedDate: po.expectedDate.toISOString(),
      receivedDate: po.receivedDate ? po.receivedDate.toISOString() : null,
      status: po.status as PurchaseOrderStatus,
      subtotal: toNum(po.subtotal),
      cgstTotal: toNum(po.cgstTotal),
      sgstTotal: toNum(po.sgstTotal),
      gstTotal: toNum(po.gstTotal),
      grandTotal: toNum(po.grandTotal),
      notes: po.notes,
      lines: lines
        .filter((l) => l.purchaseOrderId === po.id)
        .map((l) => {
          const it = itemMap.get(l.itemId);
          return {
            id: l.id,
            itemId: l.itemId,
            sku: it?.sku ?? '',
            itemName: it?.name ?? '',
            unit: it?.unit ?? 'Pcs',
            qty: l.qty,
            unitCost: toNum(l.unitCost),
            gstRate: l.gstRate as GstSlab,
            taxableAmount: toNum(l.taxableAmount),
            gstAmount: toNum(l.gstAmount),
            lineTotal: toNum(l.lineTotal),
          };
        }),
    }));
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const all = await this.getPurchaseOrders();
    return all.find((p) => p.id === id) ?? null;
  }

  async getSalesOrders(): Promise<SalesOrder[]> {
    await this.ensureSeeded();
    const db = getPgDb();
    const [sos, lines, cuss, gds, itms] = await Promise.all([
      db.select().from(schema.salesOrders).orderBy(desc(schema.salesOrders.orderDate)),
      db.select().from(schema.salesOrderLines),
      db.select().from(schema.customers),
      db.select().from(schema.godowns),
      db.select().from(schema.items),
    ]);
    const cusMap = new Map(cuss.map((c) => [c.id, c.name]));
    const gdMap = new Map(gds.map((g) => [g.id, g.name]));
    const itemMap = new Map(itms.map((i) => [i.id, i]));

    return sos.map((so) => ({
      id: so.id,
      invoiceNumber: so.invoiceNumber,
      customerId: so.customerId,
      customerName: cusMap.get(so.customerId) ?? so.customerId,
      godownId: so.godownId,
      godownName: gdMap.get(so.godownId) ?? so.godownId,
      orderDate: so.orderDate.toISOString(),
      fulfilledDate: so.fulfilledDate ? so.fulfilledDate.toISOString() : null,
      cancelledDate: so.cancelledDate ? so.cancelledDate.toISOString() : null,
      status: so.status as SalesOrderStatus,
      paymentStatus: so.paymentStatus as PaymentStatus,
      subtotal: toNum(so.subtotal),
      cgstTotal: toNum(so.cgstTotal),
      sgstTotal: toNum(so.sgstTotal),
      gstTotal: toNum(so.gstTotal),
      grandTotal: toNum(so.grandTotal),
      notes: so.notes,
      lines: lines
        .filter((l) => l.salesOrderId === so.id)
        .map((l) => {
          const it = itemMap.get(l.itemId);
          return {
            id: l.id,
            itemId: l.itemId,
            sku: it?.sku ?? '',
            itemName: it?.name ?? '',
            unit: it?.unit ?? 'Pcs',
            qty: l.qty,
            unitPrice: toNum(l.unitPrice),
            gstRate: l.gstRate as GstSlab,
            taxableAmount: toNum(l.taxableAmount),
            gstAmount: toNum(l.gstAmount),
            lineTotal: toNum(l.lineTotal),
          };
        }),
    }));
  }

  async getSalesOrderById(id: string): Promise<SalesOrder | null> {
    const all = await this.getSalesOrders();
    return all.find((s) => s.id === id) ?? null;
  }

  async getStockMovements(itemId?: string): Promise<StockMovement[]> {
    await this.ensureSeeded();
    const db = getPgDb();
    const [rows, itms, gds] = await Promise.all([
      itemId
        ? db
            .select()
            .from(schema.stockMovements)
            .where(eq(schema.stockMovements.itemId, itemId))
            .orderBy(desc(schema.stockMovements.createdAt))
        : db.select().from(schema.stockMovements).orderBy(desc(schema.stockMovements.createdAt)),
      db.select().from(schema.items),
      db.select().from(schema.godowns),
    ]);
    const itemMap = new Map(itms.map((i) => [i.id, i]));
    const gdMap = new Map(gds.map((g) => [g.id, g.name]));
    return rows.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      sku: itemMap.get(m.itemId)?.sku ?? '',
      itemName: itemMap.get(m.itemId)?.name ?? '',
      godownId: m.godownId,
      godownName: gdMap.get(m.godownId) ?? '',
      type: m.type as MovementType,
      qtyDelta: m.qtyDelta,
      balanceAfter: m.balanceAfter,
      referenceType: m.referenceType as StockMovement['referenceType'],
      referenceId: m.referenceId,
      referenceNumber: m.referenceNumber,
      reason: m.reason,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async getActivityLogs(limit = 20): Promise<ActivityLog[]> {
    await this.ensureSeeded();
    const rows = await getPgDb()
      .select()
      .from(schema.activityLogs)
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      type: r.type as ActivityLog['type'],
      title: r.title,
      description: r.description,
      referenceType: (r.referenceType ?? undefined) as ActivityLog['referenceType'],
      referenceId: r.referenceId ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async runTransaction<T>(fn: (tx: InventoryTransactionContext) => Promise<T>): Promise<T> {
    await this.ensureSeeded();
    const db = getPgDb();
    return db.transaction(async (pgTx) => {
      const ctx: InventoryTransactionContext = {
        getGodownById: async (id) => {
          const r = await pgTx.select().from(schema.godowns).where(eq(schema.godowns.id, id)).limit(1);
          return r[0] ?? null;
        },
        getSupplierById: async (id) => {
          const r = await pgTx.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).limit(1);
          return r[0] ?? null;
        },
        getCustomerById: async (id) => {
          const r = await pgTx.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
          return r[0] ?? null;
        },
        getItemById: async (id) => {
          const r = await pgTx.select().from(schema.items).where(eq(schema.items.id, id)).limit(1);
          if (!r[0]) return null;
          return {
            ...r[0],
            category: r[0].category as ItemCategory,
            costPrice: toNum(r[0].costPrice),
            sellingPrice: toNum(r[0].sellingPrice),
            gstRate: r[0].gstRate as GstSlab,
          };
        },
        getStockQty: async (itemId, godownId) => {
          const r = await pgTx
            .select()
            .from(schema.stockLevels)
            .where(and(eq(schema.stockLevels.itemId, itemId), eq(schema.stockLevels.godownId, godownId)))
            .limit(1);
          return r[0]?.qty ?? 0;
        },
        setStockQty: async (itemId, godownId, qty) => {
          await pgTx
            .insert(schema.stockLevels)
            .values({ itemId, godownId, qty })
            .onConflictDoUpdate({
              target: [schema.stockLevels.itemId, schema.stockLevels.godownId],
              set: { qty },
            });
        },
        getPurchaseOrderById: async (id) => this.getPurchaseOrderById(id),
        savePurchaseOrder: async (po) => {
          await pgTx
            .insert(schema.purchaseOrders)
            .values({
              id: po.id,
              poNumber: po.poNumber,
              supplierId: po.supplierId,
              godownId: po.godownId,
              orderDate: new Date(po.orderDate),
              expectedDate: new Date(po.expectedDate),
              receivedDate: po.receivedDate ? new Date(po.receivedDate) : null,
              status: po.status,
              subtotal: String(po.subtotal),
              cgstTotal: String(po.cgstTotal),
              sgstTotal: String(po.sgstTotal),
              gstTotal: String(po.gstTotal),
              grandTotal: String(po.grandTotal),
              notes: po.notes,
            })
            .onConflictDoUpdate({
              target: schema.purchaseOrders.id,
              set: {
                godownId: po.godownId,
                receivedDate: po.receivedDate ? new Date(po.receivedDate) : null,
                status: po.status,
                notes: po.notes,
              },
            });

          await pgTx.delete(schema.purchaseOrderLines).where(eq(schema.purchaseOrderLines.purchaseOrderId, po.id));
          if (po.lines.length > 0) {
            await pgTx.insert(schema.purchaseOrderLines).values(
              po.lines.map((l) => ({
                id: l.id,
                purchaseOrderId: po.id,
                itemId: l.itemId,
                qty: l.qty,
                unitCost: String(l.unitCost),
                gstRate: l.gstRate,
                taxableAmount: String(l.taxableAmount),
                gstAmount: String(l.gstAmount),
                lineTotal: String(l.lineTotal),
              })),
            );
          }
          return po;
        },
        getSalesOrderById: async (id) => this.getSalesOrderById(id),
        saveSalesOrder: async (so) => {
          await pgTx
            .insert(schema.salesOrders)
            .values({
              id: so.id,
              invoiceNumber: so.invoiceNumber,
              customerId: so.customerId,
              godownId: so.godownId,
              orderDate: new Date(so.orderDate),
              fulfilledDate: so.fulfilledDate ? new Date(so.fulfilledDate) : null,
              cancelledDate: so.cancelledDate ? new Date(so.cancelledDate) : null,
              status: so.status,
              paymentStatus: so.paymentStatus,
              subtotal: String(so.subtotal),
              cgstTotal: String(so.cgstTotal),
              sgstTotal: String(so.sgstTotal),
              gstTotal: String(so.gstTotal),
              grandTotal: String(so.grandTotal),
              notes: so.notes,
            })
            .onConflictDoUpdate({
              target: schema.salesOrders.id,
              set: {
                status: so.status,
                paymentStatus: so.paymentStatus,
                fulfilledDate: so.fulfilledDate ? new Date(so.fulfilledDate) : null,
                cancelledDate: so.cancelledDate ? new Date(so.cancelledDate) : null,
                notes: so.notes,
              },
            });

          await pgTx.delete(schema.salesOrderLines).where(eq(schema.salesOrderLines.salesOrderId, so.id));
          if (so.lines.length > 0) {
            await pgTx.insert(schema.salesOrderLines).values(
              so.lines.map((l) => ({
                id: l.id,
                salesOrderId: so.id,
                itemId: l.itemId,
                qty: l.qty,
                unitPrice: String(l.unitPrice),
                gstRate: l.gstRate,
                taxableAmount: String(l.taxableAmount),
                gstAmount: String(l.gstAmount),
                lineTotal: String(l.lineTotal),
              })),
            );
          }
          return so;
        },
        appendMovement: async (m) => {
          await pgTx.insert(schema.stockMovements).values({
            id: m.id,
            itemId: m.itemId,
            godownId: m.godownId,
            type: m.type,
            qtyDelta: m.qtyDelta,
            balanceAfter: m.balanceAfter,
            referenceType: m.referenceType,
            referenceId: m.referenceId,
            referenceNumber: m.referenceNumber,
            reason: m.reason,
            createdAt: new Date(m.createdAt),
          });
        },
        appendActivity: async (a) => {
          await pgTx.insert(schema.activityLogs).values({
            id: a.id,
            type: a.type,
            title: a.title,
            description: a.description,
            referenceType: a.referenceType ?? null,
            referenceId: a.referenceId ?? null,
            createdAt: new Date(a.createdAt),
          });
        },
        nextPoNumber: async () => `PO-2627-${String(Date.now()).slice(-4)}`,
        nextInvoiceNumber: async () => `INV-2627-${String(Date.now()).slice(-4)}`,
        nextTransferNumber: async () => `TRF-2627-${String(Date.now()).slice(-4)}`,
      };
      return fn(ctx);
    });
  }

  async resetDemoData(): Promise<void> {
    const db = getPgDb();
    const seed = createSeedDataset();
    await db.transaction(async (tx) => {
      await tx.delete(schema.activityLogs);
      await tx.delete(schema.stockMovements);
      await tx.delete(schema.salesOrderLines);
      await tx.delete(schema.salesOrders);
      await tx.delete(schema.purchaseOrderLines);
      await tx.delete(schema.purchaseOrders);
      await tx.delete(schema.stockLevels);
      await tx.delete(schema.items);
      await tx.delete(schema.customers);
      await tx.delete(schema.suppliers);
      await tx.delete(schema.godowns);

      await tx.insert(schema.godowns).values(seed.godowns);
      await tx.insert(schema.suppliers).values(seed.suppliers);
      await tx.insert(schema.customers).values(seed.customers);
      await tx.insert(schema.items).values(
        seed.items.map((it) => ({
          ...it,
          costPrice: String(it.costPrice),
          sellingPrice: String(it.sellingPrice),
        })),
      );
      await tx.insert(schema.stockLevels).values(seed.stockLevels);
      for (const po of seed.purchaseOrders) {
        await tx.insert(schema.purchaseOrders).values({
          id: po.id,
          poNumber: po.poNumber,
          supplierId: po.supplierId,
          godownId: po.godownId,
          orderDate: new Date(po.orderDate),
          expectedDate: new Date(po.expectedDate),
          receivedDate: po.receivedDate ? new Date(po.receivedDate) : null,
          status: po.status,
          subtotal: String(po.subtotal),
          cgstTotal: String(po.cgstTotal),
          sgstTotal: String(po.sgstTotal),
          gstTotal: String(po.gstTotal),
          grandTotal: String(po.grandTotal),
          notes: po.notes,
        });
        await tx.insert(schema.purchaseOrderLines).values(
          po.lines.map((l) => ({
            id: l.id,
            purchaseOrderId: po.id,
            itemId: l.itemId,
            qty: l.qty,
            unitCost: String(l.unitCost),
            gstRate: l.gstRate,
            taxableAmount: String(l.taxableAmount),
            gstAmount: String(l.gstAmount),
            lineTotal: String(l.lineTotal),
          })),
        );
      }
      for (const so of seed.salesOrders) {
        await tx.insert(schema.salesOrders).values({
          id: so.id,
          invoiceNumber: so.invoiceNumber,
          customerId: so.customerId,
          godownId: so.godownId,
          orderDate: new Date(so.orderDate),
          fulfilledDate: so.fulfilledDate ? new Date(so.fulfilledDate) : null,
          cancelledDate: so.cancelledDate ? new Date(so.cancelledDate) : null,
          status: so.status,
          paymentStatus: so.paymentStatus,
          subtotal: String(so.subtotal),
          cgstTotal: String(so.cgstTotal),
          sgstTotal: String(so.sgstTotal),
          gstTotal: String(so.gstTotal),
          grandTotal: String(so.grandTotal),
          notes: so.notes,
        });
        await tx.insert(schema.salesOrderLines).values(
          so.lines.map((l) => ({
            id: l.id,
            salesOrderId: so.id,
            itemId: l.itemId,
            qty: l.qty,
            unitPrice: String(l.unitPrice),
            gstRate: l.gstRate,
            taxableAmount: String(l.taxableAmount),
            gstAmount: String(l.gstAmount),
            lineTotal: String(l.lineTotal),
          })),
        );
      }
      await tx.insert(schema.stockMovements).values(
        seed.stockMovements.map((m) => ({
          id: m.id,
          itemId: m.itemId,
          godownId: m.godownId,
          type: m.type,
          qtyDelta: m.qtyDelta,
          balanceAfter: m.balanceAfter,
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          referenceNumber: m.referenceNumber,
          reason: m.reason,
          createdAt: new Date(m.createdAt),
        })),
      );
      await tx.insert(schema.activityLogs).values(
        seed.activityLogs.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          description: a.description,
          referenceType: a.referenceType ?? null,
          referenceId: a.referenceId ?? null,
          createdAt: new Date(a.createdAt),
        })),
      );
    });
  }
}
