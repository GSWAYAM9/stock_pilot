import { CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, ApiClientError, type GodownOverview } from '../../lib/api.ts';
import { formatDate, formatDateTime, formatINR } from '../../lib/format.ts';
import type { PurchaseOrder } from '../../server/types.ts';
import { Drawer } from '../ui/drawer.tsx';
import { Button, poStatusBadge, Select } from '../ui/primitives.tsx';

interface PurchaseDetailDrawerProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (order: PurchaseOrder) => void;
}

export function PurchaseDetailDrawer({
  order,
  open,
  onOpenChange,
  onUpdated,
}: PurchaseDetailDrawerProps) {
  const [godowns, setGodowns] = useState<GodownOverview[]>([]);
  const [receiveGodownId, setReceiveGodownId] = useState('gd-1');
  const [confirmingReceive, setConfirmingReceive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getGodowns()
      .then((res) => setGodowns(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (order) {
      setReceiveGodownId(order.godownId);
      setConfirmingReceive(false);
    }
  }, [order]);

  if (!order) return null;

  const totalUnits = order.lines.reduce((sum, l) => sum + l.qty, 0);

  const handleReceive = async () => {
    setSubmitting(true);
    try {
      const res = await api.receivePurchase(order.id, receiveGodownId);
      toast.success(`+${res.totalUnitsAdded} units added to ${res.godownName}`);
      setConfirmingReceive(false);
      onUpdated(res.order);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to receive PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const updated = await api.cancelPurchase(order.id);
      toast.success(`Purchase order ${updated.poNumber} cancelled`);
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Failed to cancel PO');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={order.poNumber}
      description={`${order.supplierName} · Ordered ${formatDate(order.orderDate)}`}
      headerExtra={poStatusBadge(order.status)}
      footer={
        order.status === 'PENDING' ? (
          confirmingReceive ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="receive-godown-select"
                  className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Confirm destination godown for +{totalUnits} units
                </label>
                <Select
                  id="receive-godown-select"
                  value={receiveGodownId}
                  onChange={(e) => setReceiveGodownId(e.target.value)}
                >
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code} · {g.city})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingReceive(false)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button size="sm" onClick={() => void handleReceive()} disabled={submitting}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {submitting ? 'Updating stock...' : `Confirm receipt (+${totalUnits} units)`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCancel()}
                disabled={submitting}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel PO
              </Button>
              <Button onClick={() => setConfirmingReceive(true)}>
                <PackageCheck className="h-4 w-4" />
                Mark as received
              </Button>
            </div>
          )
        ) : (
          <div className="text-xs text-[var(--text-muted)]">
            {order.status === 'RECEIVED' && order.receivedDate
              ? `Received into ${order.godownName} on ${formatDateTime(order.receivedDate)}. Duplicate receipt is locked.`
              : 'This purchase order is cancelled.'}
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Summary metadata */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
            <div className="text-[11px] text-[var(--text-muted)]">Destination godown</div>
            <div className="mt-1 text-xs font-semibold text-[var(--text-primary)]">
              {order.godownName}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
            <div className="text-[11px] text-[var(--text-muted)]">Expected arrival</div>
            <div className="mt-1 font-mono text-xs font-semibold tabular-nums">
              {formatDate(order.expectedDate)}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
            <div className="text-[11px] text-[var(--text-muted)]">Grand total</div>
            <div className="mt-1 font-mono text-sm font-bold tabular-nums text-[var(--text-primary)]">
              {formatINR(order.grandTotal, true)}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div>
          <h3 className="mb-2.5 text-xs font-semibold text-[var(--text-secondary)]">
            Order line items ({order.lines.length})
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
                      {formatINR(line.unitCost)}
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
            <span>Total payable</span>
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
