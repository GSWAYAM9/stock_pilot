import { CheckCircle2, CreditCard, RotateCcw, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api, ApiClientError } from '../../lib/api.ts';
import { formatDate, formatDateTime, formatINR } from '../../lib/format.ts';
import type { SalesOrder } from '../../server/types.ts';
import { Drawer } from '../ui/drawer.tsx';
import { Button, paymentStatusBadge, soStatusBadge } from '../ui/primitives.tsx';

interface SalesDetailDrawerProps {
  order: SalesOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (order: SalesOrder) => void;
}

export function SalesDetailDrawer({
  order,
  open,
  onOpenChange,
  onUpdated,
}: SalesDetailDrawerProps) {
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const mutate = async (
    patch: { status?: 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'; paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' },
    successMsg: string,
  ) => {
    setBusy(true);
    try {
      const updated = await api.updateSale(order.id, patch);
      toast.success(successMsg);
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Unable to update sales order');
    } finally {
      setBusy(false);
    }
  };

  const timelineSteps = [
    {
      label: 'Invoice created',
      done: true,
      time: formatDateTime(order.orderDate),
    },
    {
      label: 'Stock allocated / confirmed',
      done: order.status === 'CONFIRMED' || order.status === 'FULFILLED',
      time: order.status !== 'DRAFT' ? formatDate(order.orderDate) : 'Pending',
    },
    {
      label: order.status === 'CANCELLED' ? 'Cancelled & stock reversed' : 'Dispatched & fulfilled',
      done: order.status === 'FULFILLED' || order.status === 'CANCELLED',
      time:
        order.status === 'CANCELLED' && order.cancelledDate
          ? formatDateTime(order.cancelledDate)
          : order.fulfilledDate
            ? formatDateTime(order.fulfilledDate)
            : 'Awaiting dispatch',
      danger: order.status === 'CANCELLED',
    },
  ];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={order.invoiceNumber}
      description={`${order.customerName} · ${order.godownName}`}
      headerExtra={
        <div className="flex items-center gap-1.5">
          {soStatusBadge(order.status)}
          {paymentStatusBadge(order.paymentStatus)}
        </div>
      }
      footer={
        order.status !== 'CANCELLED' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void mutate(
                  { status: 'CANCELLED' },
                  order.status === 'DRAFT'
                    ? `${order.invoiceNumber} cancelled`
                    : `${order.invoiceNumber} cancelled and stock restored to ${order.godownName}`,
                )
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel order
            </Button>

            <div className="flex items-center gap-2">
              {order.paymentStatus !== 'PAID' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void mutate({ paymentStatus: 'PAID' }, `${order.invoiceNumber} marked as Paid`)
                  }
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Mark paid
                </Button>
              ) : null}

              {order.status !== 'FULFILLED' ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      { status: 'FULFILLED' },
                      `${order.invoiceNumber} fulfilled from ${order.godownName}`,
                    )
                  }
                >
                  <Truck className="h-3.5 w-3.5" />
                  Mark fulfilled
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)]">
            Order cancelled on {order.cancelledDate ? formatDateTime(order.cancelledDate) : '—'}. Stock quantities were restored via an append-only reversal movement.
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Status Timeline */}
        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
          <h3 className="mb-3 text-xs font-semibold text-[var(--text-secondary)]">
            Order timeline
          </h3>
          <ol className="space-y-3">
            {timelineSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    step.danger
                      ? 'text-rose-500'
                      : step.done
                        ? 'text-emerald-500'
                        : 'text-zinc-300 dark:text-zinc-700'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">{step.label}</div>
                  <div className="font-mono text-[11px] text-[var(--text-muted)]">{step.time}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Line items */}
        <div>
          <h3 className="mb-2.5 text-xs font-semibold text-[var(--text-secondary)]">
            Invoiced items ({order.lines.length})
          </h3>
          <div className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Rate</th>
                  <th className="px-3 py-2 font-medium text-right">GST</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {order.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-[var(--text-primary)]">{line.itemName}</div>
                      <div className="font-mono text-[11px] text-[var(--text-muted)]">{line.sku}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {line.qty} {line.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {formatINR(line.unitPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {line.gstRate}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium tabular-nums">
                      {formatINR(line.lineTotal, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GST Summary */}
        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Taxable subtotal</span>
            <span className="font-mono tabular-nums">{formatINR(order.subtotal, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">CGST</span>
            <span className="font-mono tabular-nums">{formatINR(order.cgstTotal, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">SGST</span>
            <span className="font-mono tabular-nums">{formatINR(order.sgstTotal, true)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border-hairline)] pt-2 text-sm font-semibold">
            <span>Invoice grand total</span>
            <span className="font-mono tabular-nums">{formatINR(order.grandTotal, true)}</span>
          </div>
        </div>

        {order.notes ? (
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs">
            <div className="font-medium text-[var(--text-secondary)]">Notes</div>
            <p className="mt-1 text-[var(--text-muted)]">{order.notes}</p>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
