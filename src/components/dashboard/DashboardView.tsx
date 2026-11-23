import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Plus,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api.ts';
import { CATEGORY_COLORS, type AppModuleId } from '../../lib/constants.ts';
import {
  formatINR,
  formatINRCompact,
  formatNumber,
  formatRelativeTime,
} from '../../lib/format.ts';
import type { DashboardData } from '../../server/types.ts';
import type { PurchasePrefill } from '../purchases/NewPurchaseSheet.tsx';
import { Button, ErrorState, Skeleton, stockStatusBadge } from '../ui/primitives.tsx';
import { KpiCard } from './KpiCard.tsx';

interface DashboardViewProps {
  onNavigate: (module: AppModuleId, detailId?: string) => void;
  onCreatePoFromAlert: (prefill: PurchasePrefill) => void;
  onQuickNewSale: () => void;
  refreshSignal: number;
}

export function DashboardView({
  onNavigate,
  onCreatePoFromAlert,
  onQuickNewSale,
  refreshSignal,
}: DashboardViewProps) {
  const [range, setRange] = useState<30 | 90>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard(range);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshSignal]);

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadDashboard()} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Operations Overview
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Real-time stock valuation, order velocity, and replenishment alerts across 3 godowns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('purchases')}>
            <Truck className="h-3.5 w-3.5" />
            Receive PO
          </Button>
          <Button size="sm" onClick={onQuickNewSale}>
            <ShoppingCart className="h-3.5 w-3.5" />
            New sale
          </Button>
        </div>
      </div>

      {/* 5 KPI Cards */}
      {loading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3"
            >
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Total stock value"
            value={data.kpis.totalStockValue.value}
            formatValue={formatINRCompact}
            subtitle={`${formatNumber(data.kpis.totalItems.totalUnits)} units · 3 godowns`}
            deltaPct={data.kpis.totalStockValue.deltaPct}
            sparkline={data.kpis.totalStockValue.sparkline}
            accentColor="#4f46e5"
            onClick={() => onNavigate('stock')}
          />
          <KpiCard
            label="Catalog SKUs"
            value={data.kpis.totalItems.value}
            formatValue={(n) => formatNumber(Math.round(n))}
            subtitle="5 electrical lines"
            deltaPct={data.kpis.totalItems.deltaPct}
            sparkline={data.kpis.totalItems.sparkline}
            accentColor="#0ea5e9"
            onClick={() => onNavigate('stock')}
          />
          <KpiCard
            label="Low-stock alerts"
            value={data.kpis.lowStockCount.value}
            formatValue={(n) => formatNumber(Math.round(n))}
            subtitle={`${data.kpis.lowStockCount.outOfStockCount} out of stock`}
            deltaPct={data.kpis.lowStockCount.deltaPct}
            sparkline={data.kpis.lowStockCount.sparkline}
            accentColor="#f59e0b"
            invertDelta
            onClick={() => onNavigate('stock')}
          />
          <KpiCard
            label="Sales (30d)"
            value={data.kpis.salesThisMonth.value}
            formatValue={formatINRCompact}
            subtitle={`${data.kpis.salesThisMonth.orderCount} active invoices`}
            deltaPct={data.kpis.salesThisMonth.deltaPct}
            sparkline={data.kpis.salesThisMonth.sparkline}
            accentColor="#10b981"
            onClick={() => onNavigate('sales')}
          />
          <KpiCard
            label="Pending POs"
            value={data.kpis.pendingPurchases.value}
            formatValue={formatINRCompact}
            subtitle={`${data.kpis.pendingPurchases.count} awaiting receipt`}
            deltaPct={data.kpis.pendingPurchases.deltaPct}
            sparkline={data.kpis.pendingPurchases.sparkline}
            accentColor="#8b5cf6"
            invertDelta
            onClick={() => onNavigate('purchases')}
          />
        </div>
      )}

      {/* Primary Row: Sales vs Purchases Area Chart + Low-Stock Alerts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-7 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Sales vs. Purchases
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Invoiced revenue compared against supplier replenishment spend (INR)
              </p>
            </div>
            <div
              role="group"
              aria-label="Chart date range"
              className="inline-flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
            >
              {([30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRange(days)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    range === days
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {loading || !data ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.salesVsPurchases}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border-hairline)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatINRCompact(v)}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(value, name) => [
                      formatINR(Number(value ?? 0)),
                      name === 'sales' ? 'Sales' : 'Purchases',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="purchases"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#purchGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 flex items-center gap-5 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
              Sales revenue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Purchase orders
            </span>
          </div>
        </section>

        {/* Low-Stock Alerts Panel */}
        <section className="xl:col-span-5 flex flex-col rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Low-stock alerts
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Items at or below reorder minimum across all godowns
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline cursor-pointer whitespace-nowrap"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data.lowStockAlerts.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="mb-2 h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                All SKUs healthy
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                No items are currently at or below their minimum stock levels.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {data.lowStockAlerts.slice(0, 6).map((alert) => {
                const ratio = Math.min(
                  100,
                  Math.round((alert.currentQty / Math.max(1, alert.minLevel)) * 100),
                );
                return (
                  <div key={alert.itemId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigate('stock', alert.itemId)}
                            className="font-mono text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
                          >
                            {alert.sku}
                          </button>
                          {stockStatusBadge(alert.status)}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-[var(--text-primary)] truncate">
                          {alert.name}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onCreatePoFromAlert({
                            itemId: alert.itemId,
                            supplierId: alert.preferredSupplierId,
                            qty: alert.suggestedOrderQty,
                            unitCost: alert.costPrice,
                          })
                        }
                        aria-label={`Create purchase order for ${alert.sku}`}
                      >
                        <Plus className="h-3 w-3" />
                        Create PO
                      </Button>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            alert.status === 'OUT' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(ratio, alert.status === 'OUT' ? 4 : 10)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                        {alert.currentQty} / {alert.minLevel} {alert.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Row: Top-Selling Items, Stock by Category Donut, Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top-Selling Items */}
        <section className="lg:col-span-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top-selling SKUs</h2>
            <p className="text-xs text-[var(--text-muted)]">By invoiced revenue (90 days)</p>
          </div>

          {loading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {data.topSellingItems.map((item, index) => (
                <button
                  key={item.itemId}
                  type="button"
                  onClick={() => onNavigate('stock', item.itemId)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-[var(--bg-hover)]/60 rounded-lg px-1.5 -mx-1.5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-[var(--text-muted)] w-4 shrink-0">
                      0{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {item.name}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--text-muted)]">
                        {item.sku} · {formatNumber(item.unitsSold)} sold
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs font-semibold tabular-nums shrink-0">
                    {formatINRCompact(item.revenue)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Stock by Category Donut */}
        <section className="lg:col-span-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Stock by category
            </h2>
            <p className="text-xs text-[var(--text-muted)]">Cost valuation distribution</p>
          </div>

          {loading || !data ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.stockByCategory}
                      dataKey="value"
                      nameKey="category"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.stockByCategory.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={CATEGORY_COLORS[entry.category] ?? '#4f46e5'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [formatINR(Number(val ?? 0)), 'Valuation']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 w-full space-y-1.5">
                {data.stockByCategory.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-[var(--text-secondary)]">{cat.category}</span>
                    </span>
                    <span className="font-mono font-medium tabular-nums text-[var(--text-primary)] shrink-0">
                      {formatINRCompact(cat.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Recent Activity Timeline */}
        <section className="lg:col-span-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent activity</h2>
              <p className="text-xs text-[var(--text-muted)]">Receipts, dispatches & transfers</p>
            </div>
            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
          </div>

          {loading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ol className="space-y-3.5">
              {data.recentActivity.slice(0, 6).map((act) => {
                const canJump = Boolean(act.referenceType && act.referenceId);
                return (
                  <li key={act.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {act.title}
                        </span>
                        {canJump ? (
                          <button
                            type="button"
                            aria-label={`Open ${act.title}`}
                            onClick={() => {
                              if (act.referenceType === 'PO') onNavigate('purchases', act.referenceId);
                              else if (act.referenceType === 'SO') onNavigate('sales', act.referenceId);
                              else if (act.referenceType === 'ITEM') onNavigate('stock', act.referenceId);
                              else if (act.referenceType === 'GODOWN') onNavigate('godowns');
                            }}
                            className="text-[var(--accent-primary)] hover:opacity-80 cursor-pointer shrink-0"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">
                        {act.description}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
