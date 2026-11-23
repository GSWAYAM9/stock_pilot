import { integer, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const godowns = pgTable('godowns', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  manager: text('manager').notNull(),
  capacityUnits: integer('capacity_units').notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  gstin: text('gstin').notNull(),
  leadTimeDays: integer('lead_time_days').notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  gstin: text('gstin').notNull(),
});

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  hsnCode: text('hsn_code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  gstRate: integer('gst_rate').notNull(),
  minLevel: integer('min_level').notNull(),
  preferredSupplierId: text('preferred_supplier_id')
    .notNull()
    .references(() => suppliers.id),
});

export const stockLevels = pgTable(
  'stock_levels',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    godownId: text('godown_id')
      .notNull()
      .references(() => godowns.id),
    qty: integer('qty').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.godownId] })],
);

export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  godownId: text('godown_id')
    .notNull()
    .references(() => godowns.id),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  expectedDate: timestamp('expected_date', { withTimezone: true }).notNull(),
  receivedDate: timestamp('received_date', { withTimezone: true }),
  status: text('status').notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  cgstTotal: numeric('cgst_total', { precision: 14, scale: 2 }).notNull(),
  sgstTotal: numeric('sgst_total', { precision: 14, scale: 2 }).notNull(),
  gstTotal: numeric('gst_total', { precision: 14, scale: 2 }).notNull(),
  grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes').notNull().default(''),
});

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id')
    .notNull()
    .references(() => items.id),
  qty: integer('qty').notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
  gstRate: integer('gst_rate').notNull(),
  taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).notNull(),
  gstAmount: numeric('gst_amount', { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
});

export const salesOrders = pgTable('sales_orders', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  godownId: text('godown_id')
    .notNull()
    .references(() => godowns.id),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  fulfilledDate: timestamp('fulfilled_date', { withTimezone: true }),
  cancelledDate: timestamp('cancelled_date', { withTimezone: true }),
  status: text('status').notNull(),
  paymentStatus: text('payment_status').notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  cgstTotal: numeric('cgst_total', { precision: 14, scale: 2 }).notNull(),
  sgstTotal: numeric('sgst_total', { precision: 14, scale: 2 }).notNull(),
  gstTotal: numeric('gst_total', { precision: 14, scale: 2 }).notNull(),
  grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes').notNull().default(''),
});

export const salesOrderLines = pgTable('sales_order_lines', {
  id: text('id').primaryKey(),
  salesOrderId: text('sales_order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id')
    .notNull()
    .references(() => items.id),
  qty: integer('qty').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  gstRate: integer('gst_rate').notNull(),
  taxableAmount: numeric('taxable_amount', { precision: 14, scale: 2 }).notNull(),
  gstAmount: numeric('gst_amount', { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  itemId: text('item_id')
    .notNull()
    .references(() => items.id),
  godownId: text('godown_id')
    .notNull()
    .references(() => godowns.id),
  type: text('type').notNull(),
  qtyDelta: integer('qty_delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  referenceType: text('reference_type').notNull(),
  referenceId: text('reference_id').notNull(),
  referenceNumber: text('reference_number').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
