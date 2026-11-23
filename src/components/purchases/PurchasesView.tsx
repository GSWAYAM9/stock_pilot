import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type SupplierDirectoryRow } from '../../lib/api.ts';
import { formatDate, formatINR } from '../../lib/format.ts';
import type { PurchaseOrder } from '../../server/types.ts';
import { DataTable, type DataTableColumn } from '../ui/data-table.tsx';
import {
  AvatarInitials,
  Button,
  ErrorState,
  Input,
  poStatusBadge,
  Select,
} from '../ui/primitives.tsx';
import { NewPurchaseSheet, type PurchasePrefill } from './NewPurchaseSheet.tsx';
import { PurchaseDetailDrawer } from './PurchaseDetailDrawer.tsx';

interface PurchasesViewProps {
  initialOrderId?: string | null;
  onClearInitialOrder?: () => void;
  prefillNewPo?: PurchasePrefill | null;
  onClearPrefill?: () => void;
  openNewTrigger?: number;
  onOrderMutated: () => void;
  refreshSignal: number;
}

export function PurchasesView({
  initialOrderId,
  onClearInitialOrder,
  prefillNewPo,
  onClearPrefill,
  openNewTrigger = 0,
  onOrderMutated,
  refreshSignal,
}: PurchasesViewProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [supplierId, setSupplierId] = useState('ALL');
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [activePrefill, setActivePrefill] = useState<PurchasePrefill | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPurchases({ search, status, supplierId, page, pageSize: 15 });
      setOrders(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSelectedOrder((prev) =>
        prev ? res.data.find((o) => o.id === prev.id) ?? prev : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  }, [search, status, supplierId, page]);

  useEffect(() => {
    api
      .getSuppliers()
      .then((res) => setSuppliers(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchOrders(), 100);
    return () => window.clearTimeout(t);
  }, [fetchOrders, refreshSignal]);

  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const found = orders.find((o) => o.id === initialOrderId);
      if (found) setSelectedOrder(found);
      onClearInitialOrder?.();
    }
  }, [initialOrderId, orders, onClearInitialOrder]);

  useEffect(() => {
    if (prefillNewPo) {
      setActivePrefill(prefillNewPo);
      setNewSheetOpen(true);
      onClearPrefill?.();
    }
  }, [prefillNewPo, onClearPrefill]);

  useEffect(() => {
    if (openNewTrigger > 0) {
      setActivePrefill(null);
      setNewSheetOpen(true);
    }
  }, [openNewTrigger]);

  const columns = useMemo<DataTableColumn<PurchaseOrder>[]>(
    () => [
      {
        id: 'poNumber',
        header: 'PO Number',
        sortValue: (row) => row.poNumber,
        cell: (row) => (
          <div>
            <div className="font-mono text-xs font-semibold text-[var(--accent-primary)]">
              {row.poNumber}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {row.lines.length} {row.lines.length === 1 ? 'line' : 'lines'}
            </div>
          </div>
        ),
      },
      {
        id: 'supplierName',
        header: 'Supplier',
        sortValue: (row) => row.supplierName,
        cell: (row) => (
          <div className="flex items-center gap-2.5 min-w-[200px]">
            <AvatarInitials name={row.supplierName} />
            <div className="min-w-0">
              <div className="font-medium text-[var(--text-primary)] truncate">
                {row.supplierName}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate">
                {row.godownName}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'expectedDate',
        header: 'Expected date',
        sortValue: (row) => row.expectedDate,
        cell: (row) => (
          <div className="text-xs tabular-nums">
            <div className="text-[var(--text-primary)]">{formatDate(row.expectedDate)}</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Ordered {formatDate(row.orderDate)}
            </div>
          </div>
        ),
      },
      {
        id: 'grandTotal',
        header: 'Amount (incl. GST)',
        align: 'right',
        sortValue: (row) => row.grandTotal,
        cell: (row) => (
          <span className="font-mono text-xs font-semibold tabular-nums">
            {formatINR(row.grandTotal)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        sortValue: (row) => row.status,
        cell: (row) => poStatusBadge(row.status),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Purchase Orders
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Track inbound supplier replenishment and receive shipments directly into godowns.
          </p>
        </div>
        <Button
          onClick={() => {
            setActivePrefill(null);
            setNewSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New purchase order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            aria-label="Search purchase orders"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search PO number, supplier, SKU..."
            className="pl-8"
          />
        </div>

        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[140px]"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>

        <Select
          aria-label="Filter by supplier"
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[200px]"
        >
          <option value="ALL">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void fetchOrders()} />
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          loading={loading}
          onRowClick={(row) => setSelectedOrder(row)}
          emptyTitle="No purchase orders match"
          emptyDescription="Raise a new purchase order to replenish godown stock."
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />
      )}

      <PurchaseDetailDrawer
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
        onUpdated={(updated) => {
          setSelectedOrder(updated);
          void fetchOrders();
          onOrderMutated();
        }}
      />

      <NewPurchaseSheet
        open={newSheetOpen}
        onOpenChange={setNewSheetOpen}
        prefill={activePrefill}
        onCreated={(created) => {
          setNewSheetOpen(false);
          setSelectedOrder(created);
          void fetchOrders();
          onOrderMutated();
        }}
      />
    </div>
  );
}
