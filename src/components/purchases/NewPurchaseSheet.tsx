import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, ApiClientError, type GodownOverview, type SupplierDirectoryRow } from '../../lib/api.ts';
import { calculateOrderTotals, formatINR } from '../../lib/format.ts';
import type { ItemWithStock, PurchaseOrder } from '../../server/types.ts';
import {
  createPurchaseOrderSchema,
  type CreatePurchaseOrderInput,
} from '../../server/validators/schemas.ts';
import { Drawer } from '../ui/drawer.tsx';
import { Button, Input, Select } from '../ui/primitives.tsx';

export interface PurchasePrefill {
  itemId: string;
  supplierId?: string;
  qty: number;
  unitCost: number;
}

interface NewPurchaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: PurchasePrefill | null;
  onCreated: (order: PurchaseOrder) => void;
}

function defaultExpectedDate(): string {
  const d = new Date(Date.now() + 4 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function NewPurchaseSheet({
  open,
  onOpenChange,
  prefill,
  onCreated,
}: NewPurchaseSheetProps) {
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRow[]>([]);
  const [godowns, setGodowns] = useState<GodownOverview[]>([]);
  const [items, setItems] = useState<ItemWithStock[]>([]);

  const form = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      supplierId: 'sup-1',
      godownId: 'gd-1',
      expectedDate: defaultExpectedDate(),
      notes: '',
      lines: [{ itemId: '', qty: 10, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.getSuppliers(),
      api.getGodowns(),
      api.listItems({ page: 1, pageSize: 100 }),
    ])
      .then(([sRes, gRes, iRes]) => {
        setSuppliers(sRes.data);
        setGodowns(gRes.data);
        setItems(iRes.data);
        const firstItem = iRes.data[0];
        if (prefill) {
          form.reset({
            supplierId: prefill.supplierId || sRes.data[0]?.id || 'sup-1',
            godownId: gRes.data[0]?.id || 'gd-1',
            expectedDate: defaultExpectedDate(),
            notes: 'Low-stock replenishment order',
            lines: [
              {
                itemId: prefill.itemId,
                qty: prefill.qty,
                unitCost: prefill.unitCost,
              },
            ],
          });
        } else if (firstItem) {
          form.reset({
            supplierId: firstItem.preferredSupplierId || sRes.data[0]?.id || 'sup-1',
            godownId: gRes.data[0]?.id || 'gd-1',
            expectedDate: defaultExpectedDate(),
            notes: '',
            lines: [{ itemId: firstItem.id, qty: 10, unitCost: firstItem.costPrice }],
          });
        }
      })
      .catch(() => {});
  }, [open, prefill, form]);

  const itemMap = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const watchedLines = form.watch('lines');

  const totals = useMemo(() => {
    return calculateOrderTotals(
      (watchedLines ?? [])
        .filter((l) => l.itemId && Number(l.qty) > 0 && Number(l.unitCost) > 0)
        .map((l) => ({
          qty: Number(l.qty),
          unitPrice: Number(l.unitCost),
          gstRate: itemMap.get(l.itemId)?.gstRate ?? 18,
        })),
    );
  }, [watchedLines, itemMap]);

  const onSubmit = async (values: CreatePurchaseOrderInput) => {
    try {
      const created = await api.createPurchase(values);
      toast.success(`Created ${created.poNumber} for ${created.supplierName}`);
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to create purchase order');
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="New Purchase Order"
      description="Create an inbound replenishment order with per-item GST calculation."
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-[var(--text-muted)]">
            Grand total:{' '}
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
              form="new-po-form"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Creating...' : 'Create purchase order'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="new-po-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="po-supplier" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Supplier
            </label>
            <Select id="po-supplier" {...form.register('supplierId')}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="po-expected" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Expected date
            </label>
            <Input id="po-expected" type="date" {...form.register('expectedDate')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="po-godown" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Destination godown
            </label>
            <Select id="po-godown" {...form.register('godownId')}>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="po-notes" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Notes (optional)
            </label>
            <Input
              id="po-notes"
              {...form.register('notes')}
              placeholder="Delivery instructions or tender ref"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Line items</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = items[0];
                append({
                  itemId: next?.id ?? '',
                  qty: 10,
                  unitCost: next?.costPrice ?? 0,
                });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          <div className="space-y-2.5">
            {fields.map((field, idx) => {
              const selectedItem = itemMap.get(watchedLines?.[idx]?.itemId ?? '');
              const qty = Number(watchedLines?.[idx]?.qty ?? 0);
              const cost = Number(watchedLines?.[idx]?.unitCost ?? 0);
              const gstRate = selectedItem?.gstRate ?? 18;
              const lineTotal = qty * cost * (1 + gstRate / 100);

              return (
                <div
                  key={field.id}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-2.5"
                >
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <label className="mb-1 block text-[11px] text-[var(--text-muted)]">
                        Item
                      </label>
                      <Select
                        aria-label={`PO line ${idx + 1} item`}
                        {...form.register(`lines.${idx}.itemId`, {
                          onChange: (e) => {
                            const picked = itemMap.get(e.target.value);
                            if (picked) {
                              form.setValue(`lines.${idx}.unitCost`, picked.costPrice);
                            }
                          },
                        })}
                      >
                        <option value="">Select item...</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.sku} — {it.name} (Stock: {it.totalQty})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Qty</label>
                      <Input
                        type="number"
                        min={1}
                        aria-label={`PO line ${idx + 1} quantity`}
                        {...form.register(`lines.${idx}.qty`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="mb-1 block text-[11px] text-[var(--text-muted)]">
                        Unit cost (₹)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step="0.01"
                        aria-label={`PO line ${idx + 1} cost`}
                        {...form.register(`lines.${idx}.unitCost`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={fields.length <= 1}
                        onClick={() => remove(idx)}
                        aria-label={`Remove line ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--text-muted)]" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>
                      {selectedItem
                        ? `Current stock: ${selectedItem.totalQty} ${selectedItem.unit} · Min: ${selectedItem.minLevel} · GST ${gstRate}%`
                        : 'Select an item to load cost and GST slab'}
                    </span>
                    <span className="font-mono font-medium text-[var(--text-primary)] tabular-nums">
                      {formatINR(lineTotal, true)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {form.formState.errors.lines?.root ? (
            <p className="text-xs text-rose-500">{form.formState.errors.lines.root.message}</p>
          ) : null}
        </div>

        {/* Live GST Breakdown */}
        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 p-4 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Subtotal</span>
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
            <span>Total with GST</span>
            <span className="font-mono tabular-nums">{formatINR(totals.grandTotal, true)}</span>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
