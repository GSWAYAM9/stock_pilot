import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type CustomerDirectoryRow,
  type SupplierDirectoryRow,
} from '../../lib/api.ts';
import { formatDate, formatINR } from '../../lib/format.ts';
import {
  AvatarInitials,
  ErrorState,
  Input,
  Skeleton,
  StatusBadge,
} from '../ui/primitives.tsx';

export function DirectoryView({
  mode,
  refreshSignal,
}: {
  mode: 'customers' | 'suppliers';
  refreshSignal: number;
}) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerDirectoryRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'customers') {
        const res = await api.getCustomers();
        setCustomers(res.data);
      } else {
        const res = await api.getSuppliers();
        setSuppliers(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${mode}`);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    setSearch('');
    void load();
  }, [load, refreshSignal]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.gstin.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const isCustomers = mode === 'customers';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {isCustomers ? 'Customers' : 'Suppliers'}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {isCustomers
              ? 'B2B electrical contractors, EPC buyers, and order totals.'
              : 'OEM electrical manufacturers, GSTIN records, and lead times.'}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            aria-label={`Search ${mode}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${mode}, city, GSTIN...`}
            className="pl-8"
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/75 text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{isCustomers ? 'Customer' : 'Supplier'}</th>
                  <th className="px-4 py-2.5 font-medium">GSTIN & City</th>
                  <th className="px-4 py-2.5 font-medium text-right">Orders</th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    {isCustomers ? 'Total invoiced' : 'Total purchased'}
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    {isCustomers ? 'Outstanding' : 'Lead time'}
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {isCustomers
                  ? filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--bg-hover)]/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={c.name} />
                            <div className="min-w-0">
                              <div className="font-medium text-[var(--text-primary)]">{c.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {c.contactName} · {c.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs">{c.gstin}</div>
                          <div className="text-xs text-[var(--text-muted)]">{c.city}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                          {c.orderCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                          {formatINR(c.totalSpent)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                          {c.outstanding > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatINR(c.outstanding)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">Settled</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-muted)] tabular-nums">
                          {c.lastOrderDate ? formatDate(c.lastOrderDate) : '—'}
                        </td>
                      </tr>
                    ))
                  : filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-[var(--bg-hover)]/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={s.name} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {s.name}
                                </span>
                                {s.pendingCount > 0 ? (
                                  <StatusBadge label={`${s.pendingCount} pending`} tone="warn" />
                                ) : null}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {s.contactName} · {s.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs">{s.gstin}</div>
                          <div className="text-xs text-[var(--text-muted)]">{s.city}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                          {s.orderCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                          {formatINR(s.totalPurchased)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-secondary)] tabular-nums">
                          {s.leadTimeDays} days
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-muted)] tabular-nums">
                          {s.lastOrderDate ? formatDate(s.lastOrderDate) : '—'}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
