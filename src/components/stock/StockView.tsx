import * as Switch from '@radix-ui/react-switch';
import { Download, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.ts';
import { ITEM_CATEGORIES } from '../../lib/constants.ts';
import { downloadCSV, formatINR, formatNumber } from '../../lib/format.ts';
import type { ItemWithStock } from '../../server/types.ts';
import { DataTable, type DataTableColumn } from '../ui/data-table.tsx';
import {
  Button,
  ErrorState,
  Input,
  Select,
  stockStatusBadge,
} from '../ui/primitives.tsx';
import { ItemDetailDrawer } from './ItemDetailDrawer.tsx';

interface StockViewProps {
  initialItemId?: string | null;
  onClearInitialItem?: () => void;
  onNavigateOrder: (type: 'PO' | 'SO', id: string) => void;
  onCreatePoForItem: (item: ItemWithStock) => void;
  onStockMutated: () => void;
  refreshSignal: number;
}

export function StockView({
  initialItemId,
  onClearInitialItem,
  onNavigateOrder,
  onCreatePoForItem,
  onStockMutated,
  refreshSignal,
}: StockViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId ?? null);

  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
      onClearInitialItem?.();
    }
  }, [initialItemId, onClearInitialItem]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listItems({
        search,
        category,
        status,
        lowStockOnly,
        page,
        pageSize: 15,
      });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock items');
    } finally {
      setLoading(false);
    }
  }, [search, category, status, lowStockOnly, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchItems();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [fetchItems, refreshSignal]);

  const handleExport = () => {
    downloadCSV(
      `stockpilot-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      ['SKU', 'Item Name', 'Category', 'Unit', 'Total Qty', 'Min Level', 'Status', 'Stock Value (INR)'],
      items.map((it) => [
        it.sku,
        it.name,
        it.category,
        it.unit,
        it.totalQty,
        it.minLevel,
        it.status,
        it.stockValue,
      ]),
    );
  };

  const columns = useMemo<DataTableColumn<ItemWithStock>[]>(
    () => [
      {
        id: 'sku',
        header: 'SKU',
        sortValue: (row) => row.sku,
        cell: (row) => (
          <span className="font-mono text-xs font-medium text-[var(--accent-primary)]">
            {row.sku}
          </span>
        ),
      },
      {
        id: 'name',
        header: 'Item',
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-[220px] max-w-[340px]">
            <div className="font-medium text-[var(--text-primary)] truncate">{row.name}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {row.category} · HSN {row.hsnCode} · GST {row.gstRate}%
            </div>
          </div>
        ),
      },
      {
        id: 'totalQty',
        header: 'Quantity (Godowns)',
        sortValue: (row) => row.totalQty,
        cell: (row) => (
          <div className="font-mono text-xs tabular-nums">
            <div className="font-semibold text-[var(--text-primary)]">
              {formatNumber(row.totalQty)} {row.unit}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {row.godownBreakdown.map((g) => `${g.godownCode.slice(0, 3)} ${g.qty}`).join(' · ')}
            </div>
          </div>
        ),
      },
      {
        id: 'minLevel',
        header: 'Min level',
        sortValue: (row) => row.minLevel,
        cell: (row) => (
          <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
            {formatNumber(row.minLevel)} {row.unit}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        sortValue: (row) => row.status,
        cell: (row) => stockStatusBadge(row.status),
      },
      {
        id: 'stockValue',
        header: 'Stock value',
        align: 'right',
        sortValue: (row) => row.stockValue,
        cell: (row) => (
          <span className="font-mono text-xs font-medium tabular-nums">
            {formatINR(row.stockValue)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Stock Inventory
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Live multi-godown balances, minimum threshold alerts, and append-only movement ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              aria-label="Search inventory by SKU or name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search SKU, item name, HSN..."
              className="pl-8"
            />
          </div>

          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-auto min-w-[180px]"
          >
            <option value="ALL">All categories</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by stock status"
            value={status}
            disabled={lowStockOnly}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-auto min-w-[140px]"
          >
            <option value="ALL">All statuses</option>
            <option value="IN_STOCK">In stock</option>
            <option value="LOW">Low stock</option>
            <option value="OUT">Out of stock</option>
          </Select>
        </div>

        <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none whitespace-nowrap">
          <Switch.Root
            checked={lowStockOnly}
            onCheckedChange={(checked) => {
              setLowStockOnly(checked);
              setPage(1);
            }}
            className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors data-[state=checked]:bg-[var(--accent-primary)] cursor-pointer"
          >
            <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-xs transition-transform data-[state=checked]:translate-x-[18px]" />
          </Switch.Root>
          Low stock only
        </label>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void fetchItems()} />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          loading={loading}
          onRowClick={(row) => setSelectedItemId(row.id)}
          emptyTitle="No inventory items found"
          emptyDescription="Adjust your category, status, or search filter to view SKUs."
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />
      )}

      <ItemDetailDrawer
        itemId={selectedItemId}
        open={Boolean(selectedItemId)}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null);
        }}
        onNavigateOrder={onNavigateOrder}
        onCreatePoForItem={onCreatePoForItem}
        onStockAdjusted={() => {
          void fetchItems();
          onStockMutated();
        }}
      />
    </div>
  );
}
