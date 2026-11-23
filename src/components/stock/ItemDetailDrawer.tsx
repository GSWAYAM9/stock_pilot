import { zodResolver } from '@hookform/resolvers/zod';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Plus, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../lib/api.ts';
import { formatDateTime, formatINR, formatNumber } from '../../lib/format.ts';
import type { ItemWithStock, MovementType, StockMovement } from '../../server/types.ts';
import { stockAdjustmentSchema, type StockAdjustmentInput } from '../../server/validators/schemas.ts';
import { Drawer, Modal } from '../ui/drawer.tsx';
import {
  Button,
  ErrorState,
  Input,
  Select,
  Skeleton,
  stockStatusBadge,
} from '../ui/primitives.tsx';

interface ItemDetailDrawerProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateOrder: (type: 'PO' | 'SO', id: string) => void;
  onCreatePoForItem: (item: ItemWithStock) => void;
  onStockAdjusted: () => void;
}

const MOVEMENT_LABELS: Record<MovementType, string> = {
  PURCHASE_IN: 'Purchase receipt',
  SALE_OUT: 'Sale dispatch',
  SALE_CANCEL_REVERSAL: 'Sale reversal',
  TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
  ADJUSTMENT: 'Adjustment',
};

export function ItemDetailDrawer({
  itemId,
  open,
  onOpenChange,
  onNavigateOrder,
  onCreatePoForItem,
  onStockAdjusted,
}: ItemDetailDrawerProps) {
  const [item, setItem] = useState<ItemWithStock | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getItemDetail(itemId);
      setItem(res.item);
      setMovements(res.movements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch item details');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (open && itemId) {
      void loadDetail();
    }
  }, [open, itemId, loadDetail]);

  const form = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      itemId: itemId ?? '',
      godownId: 'gd-1',
      qtyDelta: 0,
      reason: '',
    },
  });

  useEffect(() => {
    if (item && adjustOpen) {
      form.reset({
        itemId: item.id,
        godownId: item.godownBreakdown[0]?.godownId ?? 'gd-1',
        qtyDelta: 5,
        reason: '',
      });
    }
  }, [item, adjustOpen, form]);

  const onSubmitAdjust = async (values: StockAdjustmentInput) => {
    try {
      const res = await api.adjustStock(values);
      toast.success(
        `Stock adjusted (${values.qtyDelta > 0 ? '+' : ''}${values.qtyDelta} ${item?.unit ?? 'units'} · New balance: ${res.newQty})`,
      );
      setAdjustOpen(false);
      await loadDetail();
      onStockAdjusted();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to adjust stock';
      toast.error(message);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={item ? item.name : 'Item Details'}
        description={item ? `${item.sku} · ${item.category} · HSN ${item.hsnCode}` : undefined}
        headerExtra={item ? stockStatusBadge(item.status) : null}
        footer={
          item ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Adjust stock
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onCreatePoForItem(item);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Create purchase order
              </Button>
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadDetail()} />
        ) : item ? (
          <Tabs.Root defaultValue="overview" className="space-y-5">
            <Tabs.List className="inline-flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1">
              <Tabs.Trigger
                value="overview"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs cursor-pointer"
              >
                Overview
              </Tabs.Trigger>
              <Tabs.Trigger
                value="history"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs cursor-pointer"
              >
                Stock history ({movements.length})
              </Tabs.Trigger>
              <Tabs.Trigger
                value="godowns"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs cursor-pointer"
              >
                Godown split
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="overview" className="space-y-5 focus:outline-none">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5">
                  <div className="text-xs text-[var(--text-muted)]">Total on hand</div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums">
                    {formatNumber(item.totalQty)}{' '}
                    <span className="text-xs font-normal text-[var(--text-muted)]">{item.unit}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5">
                  <div className="text-xs text-[var(--text-muted)]">Reorder min level</div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums">
                    {formatNumber(item.minLevel)}{' '}
                    <span className="text-xs font-normal text-[var(--text-muted)]">{item.unit}</span>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5">
                  <div className="text-xs text-[var(--text-muted)]">Valuation (Cost)</div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums">
                    {formatINR(item.stockValue)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] divide-y divide-[var(--border-hairline)] text-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[var(--text-muted)]">Purchase cost</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatINR(item.costPrice, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[var(--text-muted)]">Selling rate</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatINR(item.sellingPrice, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[var(--text-muted)]">Gross margin</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[var(--text-muted)]">GST slab (CGST + SGST)</span>
                  <span className="font-mono font-medium tabular-nums">
                    {item.gstRate}% ({item.gstRate / 2}% + {item.gstRate / 2}%)
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[var(--text-muted)]">HSN code</span>
                  <span className="font-mono font-medium">{item.hsnCode}</span>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="history" className="space-y-3 focus:outline-none">
              <p className="text-xs text-[var(--text-muted)]">
                Append-only movement ledger. Cancellations and adjustments always append reversal rows.
              </p>
              <div className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 text-[var(--text-muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Event</th>
                      <th className="px-3 py-2 font-medium">Godown</th>
                      <th className="px-3 py-2 font-medium text-right">Delta</th>
                      <th className="px-3 py-2 font-medium text-right">Balance</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)]">
                    {movements.map((mv) => {
                      const isPositive = mv.qtyDelta > 0;
                      const isOrderRef = mv.referenceType === 'PO' || mv.referenceType === 'SO';
                      return (
                        <tr key={mv.id} className="hover:bg-[var(--bg-hover)]/60">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                              {isPositive ? (
                                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              )}
                              {MOVEMENT_LABELS[mv.type]}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                              {formatDateTime(mv.createdAt)} · {mv.reason}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">
                            {mv.godownName.split(' ')[0]}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${mv.qtyDelta}` : mv.qtyDelta}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[var(--text-primary)]">
                            {mv.balanceAfter}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {isOrderRef ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenChange(false);
                                  onNavigateOrder(mv.referenceType as 'PO' | 'SO', mv.referenceId);
                                }}
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--accent-primary)] hover:underline cursor-pointer"
                              >
                                {mv.referenceNumber}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                                {mv.referenceNumber}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Tabs.Content>

            <Tabs.Content value="godowns" className="space-y-3 focus:outline-none">
              {item.godownBreakdown.map((gd) => {
                const pct =
                  item.totalQty > 0 ? Math.round((gd.qty / item.totalQty) * 100) : 0;
                return (
                  <div
                    key={gd.godownId}
                    className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {gd.godownName}
                        </div>
                        <div className="font-mono text-xs text-[var(--text-muted)]">
                          {gd.godownCode} · {pct}% of total stock
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-lg font-semibold text-[var(--text-primary)]">
                          {formatNumber(gd.qty)}{' '}
                          <span className="text-xs font-normal text-[var(--text-muted)]">
                            {item.unit}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {formatINR(gd.qty * item.costPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Tabs.Content>
          </Tabs.Root>
        ) : null}
      </Drawer>

      <Modal
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title="Adjust Stock Balance"
        description={item ? `${item.sku} — ${item.name}` : undefined}
      >
        <form onSubmit={form.handleSubmit(onSubmitAdjust)} className="space-y-4">
          <div>
            <label htmlFor="adj-godown" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Godown
            </label>
            <Select id="adj-godown" {...form.register('godownId')}>
              {item?.godownBreakdown.map((gd) => (
                <option key={gd.godownId} value={gd.godownId}>
                  {gd.godownName} (Current: {gd.qty} {item.unit})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="adj-delta" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Quantity adjustment (+ to add, - to deduct)
            </label>
            <Input
              id="adj-delta"
              type="number"
              step={1}
              {...form.register('qtyDelta', { valueAsNumber: true })}
              placeholder="e.g. +10 or -3"
            />
            {form.formState.errors.qtyDelta ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.qtyDelta.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="adj-reason" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Audit reason
            </label>
            <Input
              id="adj-reason"
              {...form.register('reason')}
              placeholder="e.g. Physical cycle count variance or damaged coil write-off"
            />
            {form.formState.errors.reason ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.reason.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Record adjustment'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
