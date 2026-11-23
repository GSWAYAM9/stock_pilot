import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, MapPin, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, ApiClientError, type GodownOverview } from '../../lib/api.ts';
import { formatINR, formatINRCompact, formatNumber } from '../../lib/format.ts';
import type { ItemWithStock } from '../../server/types.ts';
import { stockTransferSchema, type StockTransferInput } from '../../server/validators/schemas.ts';
import { Modal } from '../ui/drawer.tsx';
import { Button, ErrorState, Input, Select, Skeleton } from '../ui/primitives.tsx';

export function GodownsView({
  onStockMutated,
  refreshSignal,
}: {
  onStockMutated: () => void;
  refreshSignal: number;
}) {
  const [godowns, setGodowns] = useState<GodownOverview[]>([]);
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gRes, iRes] = await Promise.all([
        api.getGodowns(),
        api.listItems({ page: 1, pageSize: 100 }),
      ]);
      setGodowns(gRes.data);
      setItems(iRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load godowns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const form = useForm<StockTransferInput>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      itemId: '',
      fromGodownId: 'gd-1',
      toGodownId: 'gd-2',
      qty: 5,
      reason: 'Regional demand balancing',
    },
  });

  useEffect(() => {
    if (transferOpen && items.length > 0) {
      const firstStocked = items.find((i) => i.totalQty > 10) ?? items[0];
      form.reset({
        itemId: firstStocked.id,
        fromGodownId: godowns[0]?.id ?? 'gd-1',
        toGodownId: godowns[1]?.id ?? 'gd-2',
        qty: 5,
        reason: 'Regional demand balancing',
      });
    }
  }, [transferOpen, items, godowns, form]);

  const watchItemId = form.watch('itemId');
  const watchFromId = form.watch('fromGodownId');
  const activeItem = items.find((i) => i.id === watchItemId);
  const availableInSource =
    activeItem?.godownBreakdown.find((g) => g.godownId === watchFromId)?.qty ?? 0;

  const onSubmitTransfer = async (values: StockTransferInput) => {
    try {
      const res = await api.transferStock(values);
      toast.success(
        `Transfer ${res.transferNumber}: moved ${res.qty} units from ${res.fromGodownName} to ${res.toGodownName}`,
      );
      setTransferOpen(false);
      await load();
      onStockMutated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Transfer failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Godowns</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Multi-warehouse stock allocation and atomic inter-godown stock transfers.
          </p>
        </div>
        <Button onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="h-4 w-4" />
          Transfer stock
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {godowns.map((gd) => (
            <section
              key={gd.id}
              className="flex flex-col rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[11px] font-semibold text-[var(--accent-primary)]">
                    {gd.code}
                  </span>
                  <h2 className="mt-0.5 text-base font-semibold text-[var(--text-primary)]">
                    {gd.name}
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatINRCompact(gd.totalValue)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {gd.city}, {gd.state}
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {gd.manager}
                </span>
              </div>

              {/* Capacity utilization */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Capacity utilization</span>
                  <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                    {formatNumber(gd.totalUnits)} / {formatNumber(gd.capacityUnits)} ({gd.utilizationPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)]"
                    style={{ width: `${gd.utilizationPct}%` }}
                  />
                </div>
              </div>

              {/* Top stocked SKUs */}
              <div className="mt-5 flex-1">
                <div className="mb-2 text-[11px] font-medium text-[var(--text-muted)]">
                  Highest-value stock ({gd.skuCount} active SKUs)
                </div>
                <div className="divide-y divide-[var(--border-hairline)]">
                  {gd.items.slice(0, 5).map((row) => (
                    <div
                      key={row.itemId}
                      className="flex items-center justify-between gap-2 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[var(--text-primary)]">
                          {row.name}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--text-muted)]">
                          {row.sku} · {formatNumber(row.qty)} {row.unit}
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-[var(--text-secondary)] shrink-0">
                        {formatINR(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Transfer Stock Between Godowns"
        description="Atomically logs TRANSFER_OUT and TRANSFER_IN ledger rows."
      >
        <form onSubmit={form.handleSubmit(onSubmitTransfer)} className="space-y-4">
          <div>
            <label htmlFor="trf-item" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Item
            </label>
            <Select id="trf-item" {...form.register('itemId')}>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name} (Total: {it.totalQty})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="trf-from" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                From godown
              </label>
              <Select id="trf-from" {...form.register('fromGodownId')}>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="trf-to" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                To godown
              </label>
              <Select id="trf-to" {...form.register('toGodownId')}>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </Select>
              {form.formState.errors.toGodownId ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.toGodownId.message}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="trf-qty" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Quantity (Available in source: {availableInSource} {activeItem?.unit ?? 'units'})
            </label>
            <Input
              id="trf-qty"
              type="number"
              min={1}
              {...form.register('qty', { valueAsNumber: true })}
            />
            {form.formState.errors.qty ? (
              <p className="mt-1 text-xs text-rose-500">{form.formState.errors.qty.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="trf-reason" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Transfer note
            </label>
            <Input id="trf-reason" {...form.register('reason')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Transferring...' : 'Execute transfer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
