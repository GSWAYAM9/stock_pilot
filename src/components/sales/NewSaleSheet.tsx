import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, ApiClientError, type CustomerDirectoryRow, type GodownOverview } from '../../lib/api.ts';
import { calculateOrderTotals, formatINR } from '../../lib/format.ts';
import type { ItemWithStock, SalesOrder } from '../../server/types.ts';
import { createSalesOrderSchema, type CreateSalesOrderInput } from '../../server/validators/schemas.ts';
import { Drawer } from '../ui/drawer.tsx';
import { Button, Input, Select } from '../ui/primitives.tsx';

interface NewSaleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (order: SalesOrder) => void;
}

export function NewSaleSheet({ open, onOpenChange, onCreated }: NewSaleSheetProps) {
  const [customers, setCustomers] = useState<CustomerDirectoryRow[]>([]);
  const [godowns, setGodowns] = useState<GodownOverview[]>([]);
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateSalesOrderInput>({
    resolver: zodResolver(createSalesOrderSchema),
    defaultValues: {
      customerId: 'cus-1',
      godownId: 'gd-1',
      status: 'FULFILLED',
      paymentStatus: 'UNPAID',
      notes: '',
      lines: [{ itemId: '', qty: 2, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setItemSearch('');
    Promise.all([
      api.getCustomers(),
      api.getGodowns(),
      api.listItems({ page: 1, pageSize: 100 }),
    ])
      .then(([cRes, gRes, iRes]) => {
        setCustomers(cRes.data);
        setGodowns(gRes.data);
        setItems(iRes.data);
        const defaultItem = iRes.data.find((it) => it.totalQty > 10) ?? iRes.data[0];
        form.reset({
          customerId: cRes.data[0]?.id ?? 'cus-1',
          godownId: gRes.data[0]?.id ?? 'gd-1',
          status: 'FULFILLED',
          paymentStatus: 'UNPAID',
          notes: '',
          lines: defaultItem
            ? [{ itemId: defaultItem.id, qty: 2, unitPrice: defaultItem.sellingPrice }]
            : [{ itemId: '', qty: 1, unitPrice: 0 }],
        });
      })
      .catch(() => {});
  }, [open, form]);

  const itemMap = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q),
    );
  }, [items, itemSearch]);

  const selectedGodownId = form.watch('godownId');
  const selectedStatus = form.watch('status');
  const watchedLines = form.watch('lines');

  const getAvailableInGodown = (itemId: string): number => {
    const item = itemMap.get(itemId);
    if (!item) return 0;
    return item.godownBreakdown.find((g) => g.godownId === selectedGodownId)?.qty ?? 0;
  };

  const totals = useMemo(() => {
    return calculateOrderTotals(
      (watchedLines ?? [])
        .filter((l) => l.itemId && Number(l.qty) > 0 && Number(l.unitPrice) > 0)
        .map((l) => ({
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          gstRate: itemMap.get(l.itemId)?.gstRate ?? 18,
        })),
    );
  }, [watchedLines, itemMap]);

  const onSubmit = async (values: CreateSalesOrderInput) => {
    setServerError(null);
    try {
      const created = await api.createSale(values);
      toast.success(
        values.status === 'DRAFT'
          ? `Draft ${created.invoiceNumber} saved`
          : `Created & dispatched ${created.invoiceNumber} (${formatINR(created.grandTotal)})`,
      );
      onCreated(created);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create sales order';
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="New Sales Order"
      description="Live godown availability and per-item GST (CGST + SGST) calculation."
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-[var(--text-muted)]">
            Invoice total:{' '}
            <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
              {formatINR(totals.grandTotal, true)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-sale-form"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Processing...' : 'Create invoice'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="new-sale-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {serverError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/8 px-3.5 py-3 text-xs text-rose-700 dark:text-rose-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <div className="font-semibold">Cannot process sales order</div>
              <p className="mt-0.5">{serverError}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="so-customer" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Customer
            </label>
            <Select id="so-customer" {...form.register('customerId')}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="so-godown" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Dispatch godown
            </label>
            <Select id="so-godown" {...form.register('godownId')}>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="so-status" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Order status
            </label>
            <Select id="so-status" {...form.register('status')}>
              <option value="FULFILLED">Fulfilled (deduct stock immediately)</option>
              <option value="CONFIRMED">Confirmed (allocate & deduct stock)</option>
              <option value="DRAFT">Draft (proforma, no deduction)</option>
            </Select>
          </div>

          <div>
            <label htmlFor="so-payment" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Payment status
            </label>
            <Select id="so-payment" {...form.register('paymentStatus')}>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </Select>
          </div>
        </div>

        {/* Item Search & Line Builder */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Line items</h3>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <Input
                  aria-label="Filter catalog items"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Filter SKUs..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = filteredItems[0] ?? items[0];
                  append({
                    itemId: next?.id ?? '',
                    qty: 1,
                    unitPrice: next?.sellingPrice ?? 0,
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            {fields.map((field, idx) => {
              const lineVal = watchedLines?.[idx];
              const pickedItem = itemMap.get(lineVal?.itemId ?? '');
              const avail = lineVal?.itemId ? getAvailableInGodown(lineVal.itemId) : 0;
              const qty = Number(lineVal?.qty ?? 0);
              const price = Number(lineVal?.unitPrice ?? 0);
              const gstRate = pickedItem?.gstRate ?? 18;
              const exceeds = selectedStatus !== 'DRAFT' && pickedItem && qty > avail;
              const lineTotal = qty * price * (1 + gstRate / 100);

              return (
                <div
                  key={field.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    exceeds
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <label className="mb-1 block text-[11px] text-[var(--text-muted)]">
                        Item
                      </label>
                      <Select
                        aria-label={`Sale line ${idx + 1} item`}
                        {...form.register(`lines.${idx}.itemId`, {
                          onChange: (e) => {
                            const it = itemMap.get(e.target.value);
                            if (it) form.setValue(`lines.${idx}.unitPrice`, it.sellingPrice);
                          },
                        })}
                      >
                        <option value="">Select item...</option>
                        {filteredItems.map((it) => {
                          const gdQty =
                            it.godownBreakdown.find((g) => g.godownId === selectedGodownId)?.qty ??
                            0;
                          return (
                            <option key={it.id} value={it.id}>
                              {it.sku} — {it.name} (Avail: {gdQty})
                            </option>
                          );
                        })}
                        {pickedItem && !filteredItems.some((f) => f.id === pickedItem.id) ? (
                          <option value={pickedItem.id}>
                            {pickedItem.sku} — {pickedItem.name} (Avail: {avail})
                          </option>
                        ) : null}
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Qty</label>
                      <Input
                        type="number"
                        min={1}
                        aria-label={`Sale line ${idx + 1} quantity`}
                        {...form.register(`lines.${idx}.qty`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="mb-1 block text-[11px] text-[var(--text-muted)]">
                        Rate (₹)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step="0.01"
                        aria-label={`Sale line ${idx + 1} rate`}
                        {...form.register(`lines.${idx}.unitPrice`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={fields.length <= 1}
                        onClick={() => remove(idx)}
                        aria-label={`Remove sale line ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--text-muted)]" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span
                      className={
                        exceeds
                          ? 'font-medium text-rose-600 dark:text-rose-400'
                          : 'text-[var(--text-muted)]'
                      }
                    >
                      {pickedItem
                        ? exceeds
                          ? `Insufficient stock: only ${avail} ${pickedItem.unit} available in selected godown`
                          : `Available in godown: ${avail} ${pickedItem.unit} · GST ${gstRate}%`
                        : 'Select an item to check live godown availability'}
                    </span>
                    <span className="font-mono font-medium text-[var(--text-primary)] tabular-nums">
                      {formatINR(lineTotal, true)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="so-notes" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Invoice notes (optional)
          </label>
          <Input
            id="so-notes"
            {...form.register('notes')}
            placeholder="Dispatch challan number or delivery instructions"
          />
        </div>

        {/* Live GST Breakdown */}
        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 p-4 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Taxable subtotal</span>
            <span className="font-mono tabular-nums">{formatINR(totals.subtotal, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">CGST</span>
            <span className="font-mono tabular-nums">{formatINR(totals.cgstTotal, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">SGST</span>
            <span className="font-mono tabular-nums">{formatINR(totals.sgstTotal, true)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border-hairline)] pt-2 text-sm font-semibold">
            <span>Invoice grand total</span>
            <span className="font-mono tabular-nums">{formatINR(totals.grandTotal, true)}</span>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
