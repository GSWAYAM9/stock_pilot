import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCSV, calculateOrderTotals, statusFor } from '../../lib/format.ts';
import { MemoryInventoryRepository } from '../repositories/memory.repo.ts';
import { AnalyticsService } from './analytics.service.ts';
import { ServiceError } from './errors.ts';
import { InventoryService } from './inventory.service.ts';

function createFreshService() {
  const repo = new MemoryInventoryRepository();
  const service = new InventoryService(repo);
  return { repo, service };
}

test('statusFor classifies OUT, LOW, and IN_STOCK consistently', () => {
  assert.equal(statusFor(0, 10), 'OUT');
  assert.equal(statusFor(10, 10), 'LOW');
  assert.equal(statusFor(4, 10), 'LOW');
  assert.equal(statusFor(11, 10), 'IN_STOCK');
});

test('per-item GST calculation computes subtotal, CGST, SGST, and grand total accurately', () => {
  const totals = calculateOrderTotals([
    { qty: 2, unitPrice: 1000, gstRate: 18 }, // 2000 + 360 GST (180 + 180)
    { qty: 5, unitPrice: 200, gstRate: 12 }, // 1000 + 120 GST (60 + 60)
  ]);
  assert.equal(totals.subtotal, 3000);
  assert.equal(totals.cgstTotal, 240);
  assert.equal(totals.sgstTotal, 240);
  assert.equal(totals.gstTotal, 480);
  assert.equal(totals.grandTotal, 3480);
});

test('receiving a PENDING PO increases stock in chosen godown and appends PURCHASE_IN movement', async () => {
  const { repo, service } = createFreshService();
  const pendingPo = (await repo.getPurchaseOrders()).find((p) => p.status === 'PENDING');
  assert.ok(pendingPo, 'Expected seeded PENDING PO');

  const firstLine = pendingPo.lines[0];
  const beforeQty = await repo.getStockQty(firstLine.itemId, 'gd-2');
  const beforeMovements = (await repo.getStockMovements(firstLine.itemId)).length;

  const res = await service.receivePurchaseOrder(pendingPo.id, 'gd-2');
  assert.equal(res.order.status, 'RECEIVED');
  assert.equal(res.order.godownId, 'gd-2');

  const afterQty = await repo.getStockQty(firstLine.itemId, 'gd-2');
  assert.equal(afterQty, beforeQty + firstLine.qty);

  const afterMovements = await repo.getStockMovements(firstLine.itemId);
  assert.equal(afterMovements.length, beforeMovements + 1);
  assert.equal(afterMovements[0].type, 'PURCHASE_IN');
  assert.equal(afterMovements[0].qtyDelta, firstLine.qty);
  assert.equal(afterMovements[0].referenceNumber, pendingPo.poNumber);
});

test('double-receiving a PO is blocked with 409 ALREADY_RECEIVED and does not duplicate stock', async () => {
  const { repo, service } = createFreshService();
  const pendingPo = (await repo.getPurchaseOrders()).find((p) => p.status === 'PENDING')!;
  const firstLine = pendingPo.lines[0];

  await service.receivePurchaseOrder(pendingPo.id, 'gd-1');
  const qtyAfterFirst = await repo.getStockQty(firstLine.itemId, 'gd-1');

  await assert.rejects(
    () => service.receivePurchaseOrder(pendingPo.id, 'gd-1'),
    (err: unknown) => {
      assert.ok(err instanceof ServiceError);
      assert.equal(err.code, 'ALREADY_RECEIVED');
      assert.equal(err.statusCode, 409);
      return true;
    },
  );

  const qtyAfterSecond = await repo.getStockQty(firstLine.itemId, 'gd-1');
  assert.equal(qtyAfterSecond, qtyAfterFirst);
});

test('fulfilled sale reduces stock and writes SALE_OUT movement', async () => {
  const { repo, service } = createFreshService();
  const item = (await repo.getItems())[1]; // CAB-002 with ample stock
  const beforeQty = await repo.getStockQty(item.id, 'gd-1');

  const order = await service.createSalesOrder({
    customerId: 'cus-1',
    godownId: 'gd-1',
    status: 'FULFILLED',
    paymentStatus: 'PAID',
    notes: 'Unit test sale',
    lines: [{ itemId: item.id, qty: 5, unitPrice: item.sellingPrice }],
  });

  const afterQty = await repo.getStockQty(item.id, 'gd-1');
  assert.equal(afterQty, beforeQty - 5);

  const latestMv = (await repo.getStockMovements(item.id))[0];
  assert.equal(latestMv.type, 'SALE_OUT');
  assert.equal(latestMv.qtyDelta, -5);
  assert.equal(latestMv.referenceNumber, order.invoiceNumber);
});

test('insufficient stock blocks sale with clear error and leaves stock unchanged', async () => {
  const { repo, service } = createFreshService();
  const lowItem = (await repo.getItems())[0]; // CAB-001 (5 in gd-1)
  const avail = await repo.getStockQty(lowItem.id, 'gd-1');
  const safeItem = (await repo.getItems())[1];
  const safeBefore = await repo.getStockQty(safeItem.id, 'gd-1');

  await assert.rejects(
    () =>
      service.createSalesOrder({
        customerId: 'cus-1',
        godownId: 'gd-1',
        status: 'FULFILLED',
        paymentStatus: 'UNPAID',
        notes: 'Should rollback atomically',
        lines: [
          { itemId: safeItem.id, qty: 2, unitPrice: safeItem.sellingPrice },
          { itemId: lowItem.id, qty: avail + 10, unitPrice: lowItem.sellingPrice },
        ],
      }),
    (err: unknown) => {
      assert.ok(err instanceof ServiceError);
      assert.equal(err.code, 'INSUFFICIENT_STOCK');
      assert.equal(err.statusCode, 400);
      assert.match(err.message, new RegExp(`Only ${avail} units of .* available in Bhiwandi Main Godown`));
      return true;
    },
  );

  // First line must NOT have been deducted (atomic rollback)
  assert.equal(await repo.getStockQty(safeItem.id, 'gd-1'), safeBefore);
});

test('cancelling a fulfilled sale restores stock and appends SALE_CANCEL_REVERSAL without deleting history', async () => {
  const { repo, service } = createFreshService();
  const item = (await repo.getItems())[1];
  const initialQty = await repo.getStockQty(item.id, 'gd-1');
  const initialMoveCount = (await repo.getStockMovements(item.id)).length;

  const created = await service.createSalesOrder({
    customerId: 'cus-2',
    godownId: 'gd-1',
    status: 'FULFILLED',
    paymentStatus: 'UNPAID',
    notes: 'Order to cancel',
    lines: [{ itemId: item.id, qty: 7, unitPrice: item.sellingPrice }],
  });

  assert.equal(await repo.getStockQty(item.id, 'gd-1'), initialQty - 7);

  const cancelled = await service.updateSalesOrder(created.id, { status: 'CANCELLED' });
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(await repo.getStockQty(item.id, 'gd-1'), initialQty);

  const movements = await repo.getStockMovements(item.id);
  // Both SALE_OUT and SALE_CANCEL_REVERSAL exist in append-only ledger
  assert.equal(movements.length, initialMoveCount + 2);
  assert.equal(movements[0].type, 'SALE_CANCEL_REVERSAL');
  assert.equal(movements[0].qtyDelta, 7);
});

test('inter-godown transfer moves qty atomically and preserves total stock', async () => {
  const { repo, service } = createFreshService();
  const item = (await repo.getItems())[1];
  const fromBefore = await repo.getStockQty(item.id, 'gd-1');
  const toBefore = await repo.getStockQty(item.id, 'gd-3');

  const res = await service.transferStock({
    itemId: item.id,
    fromGodownId: 'gd-1',
    toGodownId: 'gd-3',
    qty: 12,
    reason: 'Regional demand balancing',
  });

  assert.equal(res.qty, 12);
  assert.equal(await repo.getStockQty(item.id, 'gd-1'), fromBefore - 12);
  assert.equal(await repo.getStockQty(item.id, 'gd-3'), toBefore + 12);
});

test('buildCSV escapes commas, quotes, newlines, neutralizes formula prefixes, and preserves numbers', () => {
  const csv = buildCSV(
    ['SKU', 'Description', 'Formula', 'Qty'],
    [['CAB-001', 'Cable, 4-Core "Armoured"\nReel', '=SUM(A1:A2)', -15]],
    { includeBom: true },
  );

  assert.ok(csv.startsWith('\uFEFF'), 'Expected UTF-8 BOM prefix');
  assert.match(csv, /"Cable, 4-Core ""Armoured""\nReel"/);
  assert.match(csv, /'=SUM\(A1:A2\)/);
  assert.match(csv, /,-15$/);
});

test('getFullInventoryAuditExport exports all SKUs unfiltered with reconciled godown quantities and live mutations', async () => {
  const { repo, service } = createFreshService();
  const analytics = new AnalyticsService(repo);

  const initial = await analytics.getFullInventoryAuditExport();
  const allItems = await repo.getItems();
  const allGodowns = await repo.getGodowns();

  assert.equal(initial.totalSkus, allItems.length);
  assert.equal(initial.godownCount, allGodowns.length);
  assert.match(initial.filename, /^stockpilot-inventory-audit-\d{4}-\d{2}-\d{2}\.csv$/);
  assert.ok(initial.csv.startsWith('\uFEFFSKU,HSN Code,Item Name,Category,Unit,Preferred Supplier,'));

  // Verify every row reconciles sum of godown columns === Total Qty and has consistent column count
  const totalQtyIdx = initial.headers.indexOf('Total Qty');
  const firstGodownIdx = 6;
  for (const row of initial.rows) {
    assert.equal(row.length, initial.headers.length);
    let godownSum = 0;
    for (let i = 0; i < allGodowns.length; i++) {
      godownSum += Number(row[firstGodownIdx + i]);
    }
    assert.equal(godownSum, Number(row[totalQtyIdx]));
  }

  // Receive a pending PO and verify the audit CSV immediately reflects updated stock totals
  const pendingPo = (await repo.getPurchaseOrders()).find((p) => p.status === 'PENDING')!;
  const addedUnits = pendingPo.lines.reduce((s, l) => s + l.qty, 0);
  await service.receivePurchaseOrder(pendingPo.id, 'gd-1');

  const updated = await analytics.getFullInventoryAuditExport();
  assert.equal(updated.totalSkus, initial.totalSkus);
  assert.equal(updated.totalUnits, initial.totalUnits + addedUnits);
  assert.ok(updated.totalCostValue > initial.totalCostValue);
});
