import type {
  ApiErrorShape,
  DashboardData,
  ItemWithStock,
  PaginatedResult,
  PaymentStatus,
  PurchaseOrder,
  SalesOrder,
  StockMovement,
} from '../server/types.ts';
import type {
  CreatePurchaseOrderInput,
  CreateSalesOrderInput,
  StockAdjustmentInput,
  StockTransferInput,
} from '../server/validators/schemas.ts';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    let payload: ApiErrorShape | null = null;
    try {
      payload = (await res.json()) as ApiErrorShape;
    } catch {
      // ignore non-json body
    }
    throw new ApiClientError(
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

export interface GodownOverview {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  manager: string;
  capacityUnits: number;
  skuCount: number;
  totalUnits: number;
  totalValue: number;
  utilizationPct: number;
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    qty: number;
    value: number;
  }>;
}

export interface CustomerDirectoryRow {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
  orderCount: number;
  totalSpent: number;
  outstanding: number;
  lastOrderDate: string | null;
}

export interface SupplierDirectoryRow {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
  leadTimeDays: number;
  orderCount: number;
  pendingCount: number;
  totalPurchased: number;
  lastOrderDate: string | null;
}

export interface GlobalSearchResult {
  items: Array<{ id: string; sku: string; name: string; category: string }>;
  sales: Array<{ id: string; invoiceNumber: string; customerName: string; grandTotal: number; status: string }>;
  purchases: Array<{ id: string; poNumber: string; supplierName: string; grandTotal: number; status: string }>;
  customers: Array<{ id: string; name: string; city: string }>;
  suppliers: Array<{ id: string; name: string; city: string }>;
}

export const api = {
  getDashboard: (range: 30 | 90) => request<DashboardData>(`/api/dashboard?range=${range}`),

  listItems: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<PaginatedResult<ItemWithStock>>(`/api/items?${qs.toString()}`);
  },

  getItemDetail: (id: string) =>
    request<{ item: ItemWithStock; movements: StockMovement[] }>(`/api/items/${id}`),

  adjustStock: (body: StockAdjustmentInput) =>
    request<{ itemId: string; godownId: string; newQty: number; movement: StockMovement }>(
      '/api/stock/adjust',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  transferStock: (body: StockTransferInput) =>
    request<{
      transferNumber: string;
      itemName: string;
      fromGodownName: string;
      toGodownName: string;
      qty: number;
    }>('/api/stock/transfer', { method: 'POST', body: JSON.stringify(body) }),

  listPurchases: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<PaginatedResult<PurchaseOrder>>(`/api/purchases?${qs.toString()}`);
  },

  createPurchase: (body: CreatePurchaseOrderInput) =>
    request<PurchaseOrder>('/api/purchases', { method: 'POST', body: JSON.stringify(body) }),

  receivePurchase: (id: string, godownId: string) =>
    request<{ order: PurchaseOrder; totalUnitsAdded: number; godownName: string }>(
      `/api/purchases/${id}/receive`,
      { method: 'POST', body: JSON.stringify({ godownId }) },
    ),

  cancelPurchase: (id: string) =>
    request<PurchaseOrder>(`/api/purchases/${id}/cancel`, { method: 'POST' }),

  listSales: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<PaginatedResult<SalesOrder>>(`/api/sales?${qs.toString()}`);
  },

  createSale: (body: CreateSalesOrderInput) =>
    request<SalesOrder>('/api/sales', { method: 'POST', body: JSON.stringify(body) }),

  updateSale: (
    id: string,
    patch: { status?: 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'; paymentStatus?: PaymentStatus },
  ) => request<SalesOrder>(`/api/sales/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  getGodowns: () => request<{ data: GodownOverview[] }>('/api/godowns'),
  getCustomers: () => request<{ data: CustomerDirectoryRow[] }>('/api/customers'),
  getSuppliers: () => request<{ data: SupplierDirectoryRow[] }>('/api/suppliers'),

  getReport: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, v);
    }
    return request<Record<string, unknown>>(`/api/reports?${qs.toString()}`);
  },

  downloadFullStockAuditCsv: async (): Promise<{
    filename: string;
    rowCount: number;
    totalUnits: number;
    godownCount: number;
    generatedAt: string;
  }> => {
    const res = await fetch('/api/reports/export/stock', {
      method: 'GET',
      headers: { Accept: 'text/csv' },
    });

    if (!res.ok) {
      let payload: ApiErrorShape | null = null;
      try {
        payload = (await res.json()) as ApiErrorShape;
      } catch {
        // ignore non-json error body
      }
      throw new ApiClientError(
        payload?.error?.code ?? 'EXPORT_FAILED',
        payload?.error?.message ?? `Failed to export inventory CSV (${res.status})`,
        res.status,
      );
    }

    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/i);
    const filename =
      match?.[1] ?? `stockpilot-inventory-audit-${new Date().toISOString().slice(0, 10)}.csv`;

    const rowCount = Number(res.headers.get('X-Audit-Row-Count') ?? 0);
    const totalUnits = Number(res.headers.get('X-Audit-Total-Units') ?? 0);
    const godownCount = Number(res.headers.get('X-Audit-Godown-Count') ?? 0);
    const generatedAt = res.headers.get('X-Audit-Generated-At') ?? new Date().toISOString();

    const csvText = await res.text();
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { filename, rowCount, totalUnits, godownCount, generatedAt };
  },

  search: (q: string) => request<GlobalSearchResult>(`/api/search?q=${encodeURIComponent(q)}`),

  resetDemo: () => request<{ ok: boolean; message: string }>('/api/demo/reset', { method: 'POST' }),
};
