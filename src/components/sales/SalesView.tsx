import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CustomerDirectoryRow } from '../../lib/api.ts';
import { formatDate, formatINR } from '../../lib/format.ts';
import type { SalesOrder } from '../../server/types.ts';
import { DataTable, type DataTableColumn } from '../ui/data-table.tsx';
import {
  AvatarInitials,
  Button,
  ErrorState,
  Input,
  paymentStatusBadge,
  Select,
  soStatusBadge,
} from '../ui/primitives.tsx';
import { NewSaleSheet } from './NewSaleSheet.tsx';
import { SalesDetailDrawer } from './SalesDetailDrawer.tsx';

interface SalesViewProps {
  initialOrderId?: string | null;
  onClearInitialOrder?: () => void;
  openNewTrigger?: number;
  onOrderMutated: () => void;
  refreshSignal: number;
}

export function SalesView({
  initialOrderId,
  onClearInitialOrder,
  openNewTrigger = 0,
  onOrderMutated,
  refreshSignal,
}: SalesViewProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [customerId, setCustomerId] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [newSheetOpen, setNewSheetOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listSales({
        search,
        status,
        customerId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize: 15,
      });
      setOrders(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSelectedOrder((prev) =>
        prev ? res.data.find((o) => o.id === prev.id) ?? prev : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  }, [search, status, customerId, fromDate, toDate, page]);

  useEffect(() => {
    api
      .getCustomers()
      .then((res) => setCustomers(res.data))
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
    if (openNewTrigger > 0) {
      setNewSheetOpen(true);
    }
  }, [openNewTrigger]);

  const columns = useMemo<DataTableColumn<SalesOrder>[]>(
    () => [
      {
        id: 'invoiceNumber',
        header: 'Invoice No.',
        sortValue: (row) => row.invoiceNumber,
        cell: (row) => (
          <div>
            <div className="font-mono text-xs font-semibold text-[var(--accent-primary)]">
              {row.invoiceNumber}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {row.lines.length} {row.lines.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        ),
      },
      {
        id: 'customerName',
        header: 'Customer',
        sortValue: (row) => row.customerName,
        cell: (row) => (
          <div className="flex items-center gap-2.5 min-w-[200px]">
            <AvatarInitials name={row.customerName} />
            <div className="min-w-0">
              <div className="font-medium text-[var(--text-primary)] truncate">
                {row.customerName}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate">
                {row.godownName}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'orderDate',
        header: 'Date',
        sortValue: (row) => row.orderDate,
        cell: (row) => (
          <span className="font-mono text-xs text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
            {formatDate(row.orderDate)}
          </span>
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
        header: 'Order status',
        sortValue: (row) => row.status,
        cell: (row) => soStatusBadge(row.status),
      },
      {
        id: 'paymentStatus',
        header: 'Payment',
        sortValue: (row) => row.paymentStatus,
        cell: (row) => paymentStatusBadge(row.paymentStatus),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Sales Orders
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Create GST invoices with live godown stock validation and reversible fulfillment tracking.
          </p>
        </div>
        <Button onClick={() => setNewSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          New sale
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            aria-label="Search sales invoices"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search invoice, customer, SKU..."
            className="pl-8"
          />
        </div>

        <Select
          aria-label="Filter by sales status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[140px]"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>

        <Select
          aria-label="Filter by customer"
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[190px]"
        >
          <option value="ALL">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          aria-label="From date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        <Input
          type="date"
          aria-label="To date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void fetchOrders()} />
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          loading={loading}
          onRowClick={(row) => setSelectedOrder(row)}
          emptyTitle="No sales orders found"
          emptyDescription="Create a new sales invoice or adjust your filters."
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />
      )}

      <SalesDetailDrawer
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

      <NewSaleSheet
        open={newSheetOpen}
        onOpenChange={setNewSheetOpen}
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
