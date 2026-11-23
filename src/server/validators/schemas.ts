import { z } from 'zod';
import { ITEM_CATEGORIES } from '../../lib/constants.ts';

export const gstRateSchema = z.union([z.literal(5), z.literal(12), z.literal(18)]);

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  godownId: z.string().min(1, 'Select a destination godown'),
  expectedDate: z.string().min(1, 'Expected date is required'),
  notes: z.string().max(400).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Select an item'),
        qty: z.number().int().min(1, 'Quantity must be at least 1'),
        unitCost: z.number().positive('Unit cost must be greater than 0'),
      }),
    )
    .min(1, 'Add at least one line item'),
});

export const receivePurchaseOrderSchema = z.object({
  godownId: z.string().min(1, 'Select a godown to receive stock into'),
});

export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  godownId: z.string().min(1, 'Select a dispatch godown'),
  status: z.enum(['DRAFT', 'CONFIRMED', 'FULFILLED']),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']),
  notes: z.string().max(400).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Select an item'),
        qty: z.number().int().min(1, 'Quantity must be at least 1'),
        unitPrice: z.number().positive('Unit price must be greater than 0'),
      }),
    )
    .min(1, 'Add at least one line item'),
});

export const updateSalesOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'FULFILLED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
});

export const stockAdjustmentSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  godownId: z.string().min(1, 'Select a godown'),
  qtyDelta: z
    .number()
    .int('Adjustment must be a whole number')
    .refine((v) => v !== 0, 'Adjustment quantity cannot be zero'),
  reason: z.string().trim().min(3, 'Provide a clear reason (min 3 characters)').max(200),
});

export const stockTransferSchema = z
  .object({
    itemId: z.string().min(1, 'Select an item'),
    fromGodownId: z.string().min(1, 'Select source godown'),
    toGodownId: z.string().min(1, 'Select destination godown'),
    qty: z.number().int().min(1, 'Transfer quantity must be at least 1'),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.fromGodownId !== data.toGodownId, {
    message: 'Source and destination godowns must be different',
    path: ['toGodownId'],
  });

export const itemQuerySchema = z.object({
  search: z.string().optional().default(''),
  category: z.union([z.enum(ITEM_CATEGORIES), z.literal('ALL'), z.literal('')]).optional().default('ALL'),
  status: z.enum(['ALL', 'IN_STOCK', 'LOW', 'OUT']).optional().default('ALL'),
  lowStockOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  godownId: z.string().optional().default('ALL'),
  sortBy: z.enum(['name', 'sku', 'totalQty', 'stockValue', 'sellingPrice']).optional().default('name'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
