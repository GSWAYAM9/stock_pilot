import crypto from 'node:crypto';
import {
  calculateLineTotals,
  calculateOrderTotals,
  roundMoney,
  statusFor,
} from '../../lib/format.ts';
import type { InventoryRepository } from '../repositories/inventory.repo.ts';
import type {
  ItemWithStock,
  PaginatedResult,
  PaymentStatus,
  PurchaseOrder,
  PurchaseOrderLine,
  SalesOrder,
  SalesOrderLine,
  StockMovement,
} from '../types.ts';
import type {
  CreatePurchaseOrderInput,
  CreateSalesOrderInput,
  StockAdjustmentInput,
  StockTransferInput,
} from '../validators/schemas.ts';
import { ServiceError } from './errors.ts';

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  async listItems(params: {
    search?: string;
    category?: string;
    status?: string;
    lowStockOnly?: boolean;
    godownId?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<ItemWithStock>> {
    const [items, godowns, stockLevels] = await Promise.all([
      this.repo.getItems(),
      this.repo.getGodowns(),
      this.repo.getStockLevels(),
    ]);

    const levelMap = new Map<string, number>();
    for (const sl of stockLevels) {
      levelMap.set(`${sl.itemId}::${sl.godownId}`, sl.qty);
    }

    let enriched: ItemWithStock[] = items.map((item) => {
      const godownBreakdown = godowns.map((g) => ({
        godownId: g.id,
        godownName: g.name,
        godownCode: g.code,
        qty: levelMap.get(`${item.id}::${g.id}`) ?? 0,
      }));
      const totalQty =
        params.godownId && params.godownId !== 'ALL'
          ? (levelMap.get(`${item.id}::${params.godownId}`) ?? 0)
          : godownBreakdown.reduce((sum, g) => sum + g.qty, 0);
      const fullTotalQty = godownBreakdown.reduce((sum, g) => sum + g.qty, 0);
      const stockValue = roundMoney(totalQty * item.costPrice);
      return {
        ...item,
        totalQty,
        stockValue,
        status: statusFor(fullTotalQty, item.minLevel),
        godownBreakdown,
      };
    });

    const q = (params.search ?? '').trim().toLowerCase();
    if (q) {
      enriched = enriched.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.hsnCode.toLowerCase().includes(q),
      );
    }

    if (params.category && params.category !== 'ALL') {
      enriched = enriched.filter((it) => it.category === params.category);
    }

    if (params.lowStockOnly) {
      enriched = enriched.filter((it) => it.status === 'LOW' || it.status === 'OUT');
    } else if (params.status && params.status !== 'ALL') {
      enriched = enriched.filter((it) => it.status === params.status);
    }

    const dir = params.sortDir === 'desc' ? -1 : 1;
    enriched.sort((a, b) => {
      switch (params.sortBy) {
        case 'sku':
          return a.sku.localeCompare(b.sku) * dir;
        case 'totalQty':
          return (a.totalQty - b.totalQty) * dir;
        case 'stockValue':
          return (a.stockValue - b.stockValue) * dir;
        case 'sellingPrice':
          return (a.sellingPrice - b.sellingPrice) * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      data: enriched.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getItemDetail(itemId: string): Promise<{
    item: ItemWithStock;
    movements: StockMovement[];
  }> {
    const [item, godowns, stockLevels, movements] = await Promise.all([
      this.repo.getItemById(itemId),
      this.repo.getGodowns(),
      this.repo.getStockLevels(itemId),
      this.repo.getStockMovements(itemId),
    ]);
    if (!item) {
      throw new ServiceError('NOT_FOUND', 'Item not found', 404);
    }
    const levelMap = new Map(stockLevels.map((s) => [s.godownId, s.qty]));
    const godownBreakdown = godowns.map((g) => ({
      godownId: g.id,
      godownName: g.name,
      godownCode: g.code,
      qty: levelMap.get(g.id) ?? 0,
    }));
    const totalQty = godownBreakdown.reduce((sum, g) => sum + g.qty, 0);
    return {
      item: {
        ...item,
        totalQty,
        stockValue: roundMoney(totalQty * item.costPrice),
        status: statusFor(totalQty, item.minLevel),
        godownBreakdown,
      },
      movements,
    };
  }

  async adjustStock(input: StockAdjustmentInput): Promise<{
    itemId: string;
    godownId: string;
    newQty: number;
    movement: StockMovement;
  }> {
    return this.repo.runTransaction(async (tx) => {
      const [item, godown] = await Promise.all([
        tx.getItemById(input.itemId),
        tx.getGodownById(input.godownId),
      ]);
      if (!item) throw new ServiceError('NOT_FOUND', 'Item not found', 404);
      if (!godown) throw new ServiceError('NOT_FOUND', 'Godown not found', 404);

      const currentQty = await tx.getStockQty(item.id, godown.id);
      const newQty = currentQty + input.qtyDelta;
      if (newQty < 0) {
        throw new ServiceError(
          'INSUFFICIENT_STOCK',
          `Only ${currentQty} ${item.unit} of ${item.name} available in ${godown.name}`,
          400,
        );
      }

      await tx.setStockQty(item.id, godown.id, newQty);
      const now = new Date().toISOString();
      const refNum = `ADJ-${String(Date.now()).slice(-5)}`;
      const movement: StockMovement = {
        id: uid('mv'),
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        godownId: godown.id,
        godownName: godown.name,
        type: 'ADJUSTMENT',
        qtyDelta: input.qtyDelta,
        balanceAfter: newQty,
        referenceType: 'ADJUSTMENT',
        referenceId: uid('adj'),
        referenceNumber: refNum,
        reason: input.reason,
        createdAt: now,
      };
      await tx.appendMovement(movement);
      await tx.appendActivity({
        id: uid('act'),
        type: 'ADJUSTMENT',
        title: `Stock adjusted for ${item.sku}`,
        description: `${input.qtyDelta > 0 ? '+' : ''}${input.qtyDelta} ${item.unit} in ${godown.name} (${input.reason})`,
        referenceType: 'ITEM',
        referenceId: item.id,
        createdAt: now,
      });

      return { itemId: item.id, godownId: godown.id, newQty, movement };
    });
  }

  async transferStock(input: StockTransferInput): Promise<{
    transferNumber: string;
    itemName: string;
    fromGodownName: string;
    toGodownName: string;
    qty: number;
  }> {
    if (input.fromGodownId === input.toGodownId) {
      throw new ServiceError(
        'INVALID_TRANSFER',
        'Source and destination godowns must be different',
        400,
      );
    }

    return this.repo.runTransaction(async (tx) => {
      const [item, fromGd, toGd] = await Promise.all([
        tx.getItemById(input.itemId),
        tx.getGodownById(input.fromGodownId),
        tx.getGodownById(input.toGodownId),
      ]);
      if (!item) throw new ServiceError('NOT_FOUND', 'Item not found', 404);
      if (!fromGd || !toGd) throw new ServiceError('NOT_FOUND', 'Godown not found', 404);

      const fromQty = await tx.getStockQty(item.id, fromGd.id);
      if (fromQty < input.qty) {
        throw new ServiceError(
          'INSUFFICIENT_STOCK',
          `Only ${fromQty} ${item.unit} of ${item.name} available in ${fromGd.name}`,
          400,
        );
      }

      const toQty = await tx.getStockQty(item.id, toGd.id);
      const nextFrom = fromQty - input.qty;
      const nextTo = toQty + input.qty;

      await tx.setStockQty(item.id, fromGd.id, nextFrom);
      await tx.setStockQty(item.id, toGd.id, nextTo);

      const transferId = uid('trf');
      const transferNumber = await tx.nextTransferNumber();
      const now = new Date().toISOString();
      const reason = input.reason || 'Inter-godown stock balancing';

      await tx.appendMovement({
        id: uid('mv'),
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        godownId: fromGd.id,
        godownName: fromGd.name,
        type: 'TRANSFER_OUT',
        qtyDelta: -input.qty,
        balanceAfter: nextFrom,
        referenceType: 'TRANSFER',
        referenceId: transferId,
        referenceNumber: transferNumber,
        reason: `Transferred to ${toGd.name} — ${reason}`,
        createdAt: now,
      });

      await tx.appendMovement({
        id: uid('mv'),
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        godownId: toGd.id,
        godownName: toGd.name,
        type: 'TRANSFER_IN',
        qtyDelta: input.qty,
        balanceAfter: nextTo,
        referenceType: 'TRANSFER',
        referenceId: transferId,
        referenceNumber: transferNumber,
        reason: `Received from ${fromGd.name} — ${reason}`,
        createdAt: now,
      });

      await tx.appendActivity({
        id: uid('act'),
        type: 'TRANSFER',
        title: `Transfer ${transferNumber} completed`,
        description: `Moved ${input.qty} ${item.unit} of ${item.sku} from ${fromGd.name} to ${toGd.name}`,
        referenceType: 'GODOWN',
        referenceId: toGd.id,
        createdAt: now,
      });

      return {
        transferNumber,
        itemName: item.name,
        fromGodownName: fromGd.name,
        toGodownName: toGd.name,
        qty: input.qty,
      };
    });
  }

  async listPurchaseOrders(params: {
    search?: string;
    status?: string;
    supplierId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<PurchaseOrder>> {
    let orders = await this.repo.getPurchaseOrders();
    orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));

    const q = (params.search ?? '').trim().toLowerCase();
    if (q) {
      orders = orders.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.godownName.toLowerCase().includes(q) ||
          po.lines.some((l) => l.sku.toLowerCase().includes(q) || l.itemName.toLowerCase().includes(q)),
      );
    }
    if (params.status && params.status !== 'ALL') {
      orders = orders.filter((po) => po.status === params.status);
    }
    if (params.supplierId && params.supplierId !== 'ALL') {
      orders = orders.filter((po) => po.supplierId === params.supplierId);
    }

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
    const total = orders.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return { data: orders.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  async createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    return this.repo.runTransaction(async (tx) => {
      const [supplier, godown] = await Promise.all([
        tx.getSupplierById(input.supplierId),
        tx.getGodownById(input.godownId),
      ]);
      if (!supplier) throw new ServiceError('NOT_FOUND', 'Supplier not found', 404);
      if (!godown) throw new ServiceError('NOT_FOUND', 'Godown not found', 404);

      const lines: PurchaseOrderLine[] = [];
      for (const rawLine of input.lines) {
        const item = await tx.getItemById(rawLine.itemId);
        if (!item) throw new ServiceError('NOT_FOUND', `Item ${rawLine.itemId} not found`, 404);
        const calc = calculateLineTotals({
          qty: rawLine.qty,
          unitPrice: rawLine.unitCost,
          gstRate: item.gstRate,
        });
        lines.push({
          id: uid('pol'),
          itemId: item.id,
          sku: item.sku,
          itemName: item.name,
          unit: item.unit,
          qty: rawLine.qty,
          unitCost: rawLine.unitCost,
          gstRate: item.gstRate,
          taxableAmount: calc.taxableAmount,
          gstAmount: calc.gstAmount,
          lineTotal: calc.lineTotal,
        });
      }

      const totals = calculateOrderTotals(
        lines.map((l) => ({ qty: l.qty, unitPrice: l.unitCost, gstRate: l.gstRate })),
      );
      const poNumber = await tx.nextPoNumber();
      const now = new Date().toISOString();

      const po: PurchaseOrder = {
        id: uid('po'),
        poNumber,
        supplierId: supplier.id,
        supplierName: supplier.name,
        godownId: godown.id,
        godownName: godown.name,
        orderDate: now,
        expectedDate: new Date(input.expectedDate).toISOString(),
        receivedDate: null,
        status: 'PENDING',
        ...totals,
        notes: input.notes ?? '',
        lines,
      };

      await tx.savePurchaseOrder(po);
      const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);
      await tx.appendActivity({
        id: uid('act'),
        type: 'PO_CREATED',
        title: `Created ${poNumber}`,
        description: `Ordered ${totalUnits} units from ${supplier.name} for ${godown.name}`,
        referenceType: 'PO',
        referenceId: po.id,
        createdAt: now,
      });

      return po;
    });
  }

  /**
   * Business rule #1: Only PENDING POs can be received. Idempotent / double-receive impossible.
   */
  async receivePurchaseOrder(
    poId: string,
    godownId: string,
  ): Promise<{ order: PurchaseOrder; totalUnitsAdded: number; godownName: string }> {
    return this.repo.runTransaction(async (tx) => {
      const po = await tx.getPurchaseOrderById(poId);
      if (!po) throw new ServiceError('NOT_FOUND', 'Purchase order not found', 404);
      if (po.status === 'RECEIVED') {
        throw new ServiceError(
          'ALREADY_RECEIVED',
          `Purchase order ${po.poNumber} has already been received`,
          409,
        );
      }
      if (po.status !== 'PENDING') {
        throw new ServiceError(
          'INVALID_TRANSITION',
          `Only Pending purchase orders can be received (current status: ${po.status})`,
          409,
        );
      }

      const godown = await tx.getGodownById(godownId);
      if (!godown) throw new ServiceError('NOT_FOUND', 'Destination godown not found', 404);

      const now = new Date().toISOString();
      let totalUnitsAdded = 0;

      for (const line of po.lines) {
        const current = await tx.getStockQty(line.itemId, godown.id);
        const nextQty = current + line.qty;
        await tx.setStockQty(line.itemId, godown.id, nextQty);
        totalUnitsAdded += line.qty;

        await tx.appendMovement({
          id: uid('mv'),
          itemId: line.itemId,
          sku: line.sku,
          itemName: line.itemName,
          godownId: godown.id,
          godownName: godown.name,
          type: 'PURCHASE_IN',
          qtyDelta: line.qty,
          balanceAfter: nextQty,
          referenceType: 'PO',
          referenceId: po.id,
          referenceNumber: po.poNumber,
          reason: `Received from ${po.supplierName}`,
          createdAt: now,
        });
      }

      const updated: PurchaseOrder = {
        ...po,
        godownId: godown.id,
        godownName: godown.name,
        status: 'RECEIVED',
        receivedDate: now,
      };
      await tx.savePurchaseOrder(updated);

      await tx.appendActivity({
        id: uid('act'),
        type: 'PURCHASE_RECEIVED',
        title: `Received ${po.poNumber}`,
        description: `+${totalUnitsAdded} units added to ${godown.name}`,
        referenceType: 'PO',
        referenceId: po.id,
        createdAt: now,
      });

      return { order: updated, totalUnitsAdded, godownName: godown.name };
    });
  }

  async cancelPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    return this.repo.runTransaction(async (tx) => {
      const po = await tx.getPurchaseOrderById(poId);
      if (!po) throw new ServiceError('NOT_FOUND', 'Purchase order not found', 404);
      if (po.status !== 'PENDING') {
        throw new ServiceError(
          'INVALID_TRANSITION',
          `Cannot cancel purchase order in ${po.status} status`,
          409,
        );
      }
      const updated: PurchaseOrder = { ...po, status: 'CANCELLED' };
      await tx.savePurchaseOrder(updated);
      return updated;
    });
  }

  async listSalesOrders(params: {
    search?: string;
    status?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<SalesOrder>> {
    let orders = await this.repo.getSalesOrders();
    orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));

    const q = (params.search ?? '').trim().toLowerCase();
    if (q) {
      orders = orders.filter(
        (so) =>
          so.invoiceNumber.toLowerCase().includes(q) ||
          so.customerName.toLowerCase().includes(q) ||
          so.godownName.toLowerCase().includes(q) ||
          so.lines.some((l) => l.sku.toLowerCase().includes(q) || l.itemName.toLowerCase().includes(q)),
      );
    }
    if (params.status && params.status !== 'ALL') {
      orders = orders.filter((so) => so.status === params.status);
    }
    if (params.customerId && params.customerId !== 'ALL') {
      orders = orders.filter((so) => so.customerId === params.customerId);
    }
    if (params.fromDate) {
      orders = orders.filter((so) => so.orderDate >= params.fromDate!);
    }
    if (params.toDate) {
      const toEnd = `${params.toDate.slice(0, 10)}T23:59:59.999Z`;
      orders = orders.filter((so) => so.orderDate <= toEnd);
    }

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
    const total = orders.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return { data: orders.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  /**
   * Business rule #2: Confirmed/Fulfilled sales deduct stock atomically and block insufficient stock.
   */
  async createSalesOrder(input: CreateSalesOrderInput): Promise<SalesOrder> {
    return this.repo.runTransaction(async (tx) => {
      const [customer, godown] = await Promise.all([
        tx.getCustomerById(input.customerId),
        tx.getGodownById(input.godownId),
      ]);
      if (!customer) throw new ServiceError('NOT_FOUND', 'Customer not found', 404);
      if (!godown) throw new ServiceError('NOT_FOUND', 'Dispatch godown not found', 404);

      const shouldDeduct = input.status === 'CONFIRMED' || input.status === 'FULFILLED';
      const aggregatedNeed = new Map<string, number>();

      const lines: SalesOrderLine[] = [];
      for (const rawLine of input.lines) {
        const item = await tx.getItemById(rawLine.itemId);
        if (!item) throw new ServiceError('NOT_FOUND', `Item ${rawLine.itemId} not found`, 404);
        aggregatedNeed.set(item.id, (aggregatedNeed.get(item.id) ?? 0) + rawLine.qty);

        const calc = calculateLineTotals({
          qty: rawLine.qty,
          unitPrice: rawLine.unitPrice,
          gstRate: item.gstRate,
        });
        lines.push({
          id: uid('sol'),
          itemId: item.id,
          sku: item.sku,
          itemName: item.name,
          unit: item.unit,
          qty: rawLine.qty,
          unitPrice: rawLine.unitPrice,
          gstRate: item.gstRate,
          taxableAmount: calc.taxableAmount,
          gstAmount: calc.gstAmount,
          lineTotal: calc.lineTotal,
        });
      }

      if (shouldDeduct) {
        for (const [itemId, needed] of aggregatedNeed.entries()) {
          const available = await tx.getStockQty(itemId, godown.id);
          if (available < needed) {
            const item = await tx.getItemById(itemId);
            throw new ServiceError(
              'INSUFFICIENT_STOCK',
              `Only ${available} units of ${item?.name ?? itemId} available in ${godown.name}`,
              400,
            );
          }
        }
      }

      const totals = calculateOrderTotals(
        lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, gstRate: l.gstRate })),
      );
      const invoiceNumber = await tx.nextInvoiceNumber();
      const now = new Date().toISOString();

      const so: SalesOrder = {
        id: uid('so'),
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        godownId: godown.id,
        godownName: godown.name,
        orderDate: now,
        fulfilledDate: input.status === 'FULFILLED' ? now : null,
        cancelledDate: null,
        status: input.status,
        paymentStatus: input.paymentStatus,
        ...totals,
        notes: input.notes ?? '',
        lines,
      };

      if (shouldDeduct) {
        for (const line of lines) {
          const current = await tx.getStockQty(line.itemId, godown.id);
          const nextQty = current - line.qty;
          await tx.setStockQty(line.itemId, godown.id, nextQty);

          await tx.appendMovement({
            id: uid('mv'),
            itemId: line.itemId,
            sku: line.sku,
            itemName: line.itemName,
            godownId: godown.id,
            godownName: godown.name,
            type: 'SALE_OUT',
            qtyDelta: -line.qty,
            balanceAfter: nextQty,
            referenceType: 'SO',
            referenceId: so.id,
            referenceNumber: so.invoiceNumber,
            reason: `Dispatched to ${customer.name}`,
            createdAt: now,
          });
        }
      }

      await tx.saveSalesOrder(so);
      const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);
      await tx.appendActivity({
        id: uid('act'),
        type: input.status === 'FULFILLED' ? 'SALE_FULFILLED' : 'SALE_CREATED',
        title: `${input.status === 'FULFILLED' ? 'Fulfilled' : 'Created'} ${invoiceNumber}`,
        description: `${totalUnits} units for ${customer.name} (${godown.name})`,
        referenceType: 'SO',
        referenceId: so.id,
        createdAt: now,
      });

      return so;
    });
  }

  /**
   * Business rule #3: Cancelling a confirmed/fulfilled sale restores stock via append-only reversal movement.
   */
  async updateSalesOrder(
    soId: string,
    patch: { status?: 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'; paymentStatus?: PaymentStatus },
  ): Promise<SalesOrder> {
    return this.repo.runTransaction(async (tx) => {
      const so = await tx.getSalesOrderById(soId);
      if (!so) throw new ServiceError('NOT_FOUND', 'Sales order not found', 404);

      const now = new Date().toISOString();
      let nextStatus = so.status;
      let fulfilledDate = so.fulfilledDate;
      let cancelledDate = so.cancelledDate;

      if (patch.status && patch.status !== so.status) {
        if (so.status === 'CANCELLED') {
          throw new ServiceError('INVALID_TRANSITION', 'Cancelled orders cannot be modified', 409);
        }

        const wasDeducted = so.status === 'CONFIRMED' || so.status === 'FULFILLED';
        const willDeduct = patch.status === 'CONFIRMED' || patch.status === 'FULFILLED';

        if (!wasDeducted && willDeduct) {
          // Validate & deduct stock when moving from DRAFT -> CONFIRMED/FULFILLED
          const godown = await tx.getGodownById(so.godownId);
          for (const line of so.lines) {
            const avail = await tx.getStockQty(line.itemId, so.godownId);
            if (avail < line.qty) {
              throw new ServiceError(
                'INSUFFICIENT_STOCK',
                `Only ${avail} units of ${line.itemName} available in ${godown?.name ?? so.godownName}`,
                400,
              );
            }
          }
          for (const line of so.lines) {
            const current = await tx.getStockQty(line.itemId, so.godownId);
            const nextQty = current - line.qty;
            await tx.setStockQty(line.itemId, so.godownId, nextQty);
            await tx.appendMovement({
              id: uid('mv'),
              itemId: line.itemId,
              sku: line.sku,
              itemName: line.itemName,
              godownId: so.godownId,
              godownName: so.godownName,
              type: 'SALE_OUT',
              qtyDelta: -line.qty,
              balanceAfter: nextQty,
              referenceType: 'SO',
              referenceId: so.id,
              referenceNumber: so.invoiceNumber,
              reason: `Dispatched to ${so.customerName}`,
              createdAt: now,
            });
          }
        }

        if (patch.status === 'FULFILLED') {
          fulfilledDate = now;
          await tx.appendActivity({
            id: uid('act'),
            type: 'SALE_FULFILLED',
            title: `Fulfilled ${so.invoiceNumber}`,
            description: `Order dispatched to ${so.customerName} from ${so.godownName}`,
            referenceType: 'SO',
            referenceId: so.id,
            createdAt: now,
          });
        }

        if (patch.status === 'CANCELLED') {
          cancelledDate = now;
          if (wasDeducted) {
            for (const line of so.lines) {
              const current = await tx.getStockQty(line.itemId, so.godownId);
              const restored = current + line.qty;
              await tx.setStockQty(line.itemId, so.godownId, restored);
              await tx.appendMovement({
                id: uid('mv'),
                itemId: line.itemId,
                sku: line.sku,
                itemName: line.itemName,
                godownId: so.godownId,
                godownName: so.godownName,
                type: 'SALE_CANCEL_REVERSAL',
                qtyDelta: line.qty,
                balanceAfter: restored,
                referenceType: 'SO',
                referenceId: so.id,
                referenceNumber: so.invoiceNumber,
                reason: `Stock restored — ${so.invoiceNumber} cancelled`,
                createdAt: now,
              });
            }
          }
          await tx.appendActivity({
            id: uid('act'),
            type: 'SALE_CANCELLED',
            title: `Cancelled ${so.invoiceNumber}`,
            description: wasDeducted
              ? `Restored stock to ${so.godownName} for ${so.customerName}`
              : `Draft order for ${so.customerName} cancelled`,
            referenceType: 'SO',
            referenceId: so.id,
            createdAt: now,
          });
        }

        nextStatus = patch.status;
      }

      const updated: SalesOrder = {
        ...so,
        status: nextStatus,
        paymentStatus: patch.paymentStatus ?? so.paymentStatus,
        fulfilledDate,
        cancelledDate,
      };
      await tx.saveSalesOrder(updated);
      return updated;
    });
  }

  async getGodownsOverview() {
    const [godowns, items, stockLevels] = await Promise.all([
      this.repo.getGodowns(),
      this.repo.getItems(),
      this.repo.getStockLevels(),
    ]);
    const itemMap = new Map(items.map((i) => [i.id, i]));

    return godowns.map((gd) => {
      const rows = stockLevels
        .filter((sl) => sl.godownId === gd.id && sl.qty > 0)
        .map((sl) => {
          const item = itemMap.get(sl.itemId)!;
          return {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            category: item.category,
            unit: item.unit,
            qty: sl.qty,
            value: roundMoney(sl.qty * item.costPrice),
          };
        })
        .sort((a, b) => b.value - a.value);

      const totalUnits = rows.reduce((sum, r) => sum + r.qty, 0);
      const totalValue = roundMoney(rows.reduce((sum, r) => sum + r.value, 0));

      return {
        ...gd,
        skuCount: rows.length,
        totalUnits,
        totalValue,
        utilizationPct: Math.min(100, Math.round((totalUnits / gd.capacityUnits) * 100)),
        items: rows,
      };
    });
  }

  async getCustomersDirectory() {
    const [customers, salesOrders] = await Promise.all([
      this.repo.getCustomers(),
      this.repo.getSalesOrders(),
    ]);
    return customers.map((c) => {
      const orders = salesOrders
        .filter((so) => so.customerId === c.id && so.status !== 'CANCELLED')
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
      const totalSpent = roundMoney(orders.reduce((sum, o) => sum + o.grandTotal, 0));
      const outstanding = roundMoney(
        orders
          .filter((o) => o.paymentStatus !== 'PAID')
          .reduce((sum, o) => sum + (o.paymentStatus === 'PARTIAL' ? o.grandTotal * 0.5 : o.grandTotal), 0),
      );
      return {
        ...c,
        orderCount: orders.length,
        totalSpent,
        outstanding,
        lastOrderDate: orders[0]?.orderDate ?? null,
      };
    });
  }

  async getSuppliersDirectory() {
    const [suppliers, purchaseOrders] = await Promise.all([
      this.repo.getSuppliers(),
      this.repo.getPurchaseOrders(),
    ]);
    return suppliers.map((s) => {
      const orders = purchaseOrders
        .filter((po) => po.supplierId === s.id && po.status !== 'CANCELLED')
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
      const totalPurchased = roundMoney(orders.reduce((sum, o) => sum + o.grandTotal, 0));
      const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
      return {
        ...s,
        orderCount: orders.length,
        pendingCount,
        totalPurchased,
        lastOrderDate: orders[0]?.orderDate ?? null,
      };
    });
  }

  async globalSearch(query: string) {
    const q = query.trim().toLowerCase();
    const [items, sales, purchases, customers, suppliers] = await Promise.all([
      this.repo.getItems(),
      this.repo.getSalesOrders(),
      this.repo.getPurchaseOrders(),
      this.repo.getCustomers(),
      this.repo.getSuppliers(),
    ]);

    if (!q) {
      return {
        items: items.slice(0, 5),
        sales: sales.slice(0, 4),
        purchases: purchases.slice(0, 4),
        customers: customers.slice(0, 3),
        suppliers: suppliers.slice(0, 3),
      };
    }

    return {
      items: items
        .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
        .slice(0, 6),
      sales: sales
        .filter((s) => s.invoiceNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q))
        .slice(0, 5),
      purchases: purchases
        .filter((p) => p.poNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q))
        .slice(0, 5),
      customers: customers
        .filter((c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
        .slice(0, 4),
      suppliers: suppliers
        .filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
        .slice(0, 4),
    };
  }

  async resetDemoData(): Promise<void> {
    await this.repo.resetDemoData();
  }
}
