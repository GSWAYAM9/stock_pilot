import { Router, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { getInventoryRepository } from '../repositories/index.ts';
import { AnalyticsService } from '../services/analytics.service.ts';
import { ServiceError } from '../services/errors.ts';
import { InventoryService } from '../services/inventory.service.ts';
import {
  createPurchaseOrderSchema,
  createSalesOrderSchema,
  itemQuerySchema,
  receivePurchaseOrderSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  updateSalesOrderStatusSchema,
} from '../validators/schemas.ts';

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApiRouter(): Router {
  const router = Router();
  const repo = getInventoryRepository();
  const inventory = new InventoryService(repo);
  const analytics = new AnalyticsService(repo);

  router.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
      const range = req.query.range === '90' ? 90 : 30;
      const data = await analytics.getDashboard(range);
      res.json(data);
    }),
  );

  router.get(
    '/items',
    asyncHandler(async (req, res) => {
      const parsed = itemQuerySchema.parse(req.query);
      const result = await inventory.listItems(parsed);
      res.json(result);
    }),
  );

  router.get(
    '/items/:id',
    asyncHandler(async (req, res) => {
      const detail = await inventory.getItemDetail(String(req.params.id));
      res.json(detail);
    }),
  );

  router.post(
    '/stock/adjust',
    asyncHandler(async (req, res) => {
      const input = stockAdjustmentSchema.parse(req.body);
      const result = await inventory.adjustStock(input);
      res.status(201).json(result);
    }),
  );

  router.post(
    '/stock/transfer',
    asyncHandler(async (req, res) => {
      const input = stockTransferSchema.parse(req.body);
      const result = await inventory.transferStock(input);
      res.status(201).json(result);
    }),
  );

  router.get(
    '/purchases',
    asyncHandler(async (req, res) => {
      const result = await inventory.listPurchaseOrders({
        search: String(req.query.search ?? ''),
        status: String(req.query.status ?? 'ALL'),
        supplierId: String(req.query.supplierId ?? 'ALL'),
        page: Number(req.query.page ?? 1) || 1,
        pageSize: Number(req.query.pageSize ?? 20) || 20,
      });
      res.json(result);
    }),
  );

  router.post(
    '/purchases',
    asyncHandler(async (req, res) => {
      const input = createPurchaseOrderSchema.parse(req.body);
      const created = await inventory.createPurchaseOrder(input);
      res.status(201).json(created);
    }),
  );

  router.post(
    '/purchases/:id/receive',
    asyncHandler(async (req, res) => {
      const input = receivePurchaseOrderSchema.parse(req.body);
      const result = await inventory.receivePurchaseOrder(String(req.params.id), input.godownId);
      res.json(result);
    }),
  );

  router.post(
    '/purchases/:id/cancel',
    asyncHandler(async (req, res) => {
      const result = await inventory.cancelPurchaseOrder(String(req.params.id));
      res.json(result);
    }),
  );

  router.get(
    '/sales',
    asyncHandler(async (req, res) => {
      const result = await inventory.listSalesOrders({
        search: String(req.query.search ?? ''),
        status: String(req.query.status ?? 'ALL'),
        customerId: String(req.query.customerId ?? 'ALL'),
        fromDate: req.query.fromDate ? String(req.query.fromDate) : undefined,
        toDate: req.query.toDate ? String(req.query.toDate) : undefined,
        page: Number(req.query.page ?? 1) || 1,
        pageSize: Number(req.query.pageSize ?? 20) || 20,
      });
      res.json(result);
    }),
  );

  router.post(
    '/sales',
    asyncHandler(async (req, res) => {
      const input = createSalesOrderSchema.parse(req.body);
      const created = await inventory.createSalesOrder(input);
      res.status(201).json(created);
    }),
  );

  router.patch(
    '/sales/:id',
    asyncHandler(async (req, res) => {
      const patch = updateSalesOrderStatusSchema.parse(req.body);
      const updated = await inventory.updateSalesOrder(String(req.params.id), patch);
      res.json(updated);
    }),
  );

  router.get(
    '/godowns',
    asyncHandler(async (_req, res) => {
      const data = await inventory.getGodownsOverview();
      res.json({ data });
    }),
  );

  router.get(
    '/customers',
    asyncHandler(async (_req, res) => {
      const data = await inventory.getCustomersDirectory();
      res.json({ data });
    }),
  );

  router.get(
    '/suppliers',
    asyncHandler(async (_req, res) => {
      const data = await inventory.getSuppliersDirectory();
      res.json({ data });
    }),
  );

  router.get(
    '/reports',
    asyncHandler(async (req, res) => {
      const rawType = String(req.query.type ?? 'stock');
      const type =
        rawType === 'sales' || rawType === 'purchase' || rawType === 'stock'
          ? rawType
          : 'stock';
      const report = await analytics.getReport({
        type,
        fromDate: req.query.fromDate ? String(req.query.fromDate) : undefined,
        toDate: req.query.toDate ? String(req.query.toDate) : undefined,
        category: req.query.category ? String(req.query.category) : undefined,
        godownId: req.query.godownId ? String(req.query.godownId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      res.json(report);
    }),
  );

  router.get(
    '/reports/export/stock',
    asyncHandler(async (_req, res) => {
      const exportPayload = await analytics.getFullInventoryAuditExport();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${exportPayload.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Audit-Row-Count', String(exportPayload.totalSkus));
      res.setHeader('X-Audit-Total-Units', String(exportPayload.totalUnits));
      res.setHeader('X-Audit-Godown-Count', String(exportPayload.godownCount));
      res.setHeader('X-Audit-Generated-At', exportPayload.generatedAt);
      res.status(200).send(exportPayload.csv);
    }),
  );

  router.get(
    '/search',
    asyncHandler(async (req, res) => {
      const result = await inventory.globalSearch(String(req.query.q ?? ''));
      res.json(result);
    }),
  );

  router.post(
    '/demo/reset',
    asyncHandler(async (_req, res) => {
      await inventory.resetDemoData();
      res.json({ ok: true, message: 'Demo dataset restored to initial state' });
    }),
  );

  // Unified error shape: { error: { code, message } }
  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      const firstIssue = err.issues[0];
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: firstIssue?.message ?? 'Invalid request payload',
        },
      });
      return;
    }
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }
    console.error('Unhandled API error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected server error occurred',
      },
    });
  });

  return router;
}
