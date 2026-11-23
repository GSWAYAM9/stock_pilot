import * as Tabs from '@radix-ui/react-tabs';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, ApiClientError, type GodownOverview } from '../../lib/api.ts';
import { ITEM_CATEGORIES } from '../../lib/constants.ts';
import {
  downloadCSV,
  formatDate,
  formatDateTime,
  formatINR,
  formatINRCompact,
  formatNumber,
} from '../../lib/format.ts';
import {
  Button,
  ErrorState,
  Input,
  paymentStatusBadge,
  poStatusBadge,
  Select,
  Skeleton,
  soStatusBadge,
  stockStatusBadge,
} from '../ui/primitives.tsx';

type ReportTab = 'stock' | 'sales' | 'purchase';

interface StockReportPayload {
  type: 'stock';
  summary: {
    totalSkus: number;
    totalUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
    lowCount: number;
  };
  chart: Array<{ label: string; fullLabel?: string; value: number }>;
  rows: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    bhiwandiQty: number;
    puneQty: number;
    ahmedabadQty: number;
    totalQty: number;
    minLevel: number;
    status: 'IN_STOCK' | 'LOW' | 'OUT';
    costValue: number;
    retailValue: number;
  }>;
}

interface SalesReportPayload {
  type: 'sales';
  summary: {
    orderCount: number;
    fulfilledCount: number;
    totalRevenue: number;
    totalGst: number;
    avgOrderValue: number;
  };
  chart: Array<{ label: string; value: number }>;
  rows: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    godownName: string;
    orderDate: string;
    status: 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    subtotal: number;
    gstTotal: number;
    grandTotal: number;
  }>;
}

interface PurchaseReportPayload {
  type: 'purchase';
  summary: {
    orderCount: number;
    receivedCount: number;
    pendingCount: number;
    totalSpend: number;
    totalGst: number;
  };
  chart: Array<{ label: string; value: number }>;
  rows: Array<{
    id: string;
    poNumber: string;
    supplierName: string;
    godownName: string;
    orderDate: string;
    expectedDate: string;
    status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
    subtotal: number;
    gstTotal: number;
    grandTotal: number;
  }>;
}

type ReportPayload = StockReportPayload | SalesReportPayload | PurchaseReportPayload;

export function ReportsView({ refreshSignal }: { refreshSignal: number }) {
  const [tab, setTab] = useState<ReportTab>('stock');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [category, setCategory] = useState('ALL');
  const [godownId, setGodownId] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const [godowns, setGodowns] = useState<GodownOverview[]>([]);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingAudit, setExportingAudit] = useState(false);
  const [lastAuditExport, setLastAuditExport] = useState<{
    filename: string;
    rowCount: number;
    totalUnits: number;
    godownCount: number;
    generatedAt: string;
  } | null>(null);

  useEffect(() => {
    api
      .getGodowns()
      .then((res) => setGodowns(res.data))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await api.getReport({
        type: tab,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        category: tab === 'stock' ? category : undefined,
        godownId,
        status,
      })) as unknown as ReportPayload;
      setReport(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [tab, fromDate, toDate, category, godownId, status]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport, refreshSignal]);

  const handleExportCsv = () => {
    if (!report) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (report.type === 'stock') {
      downloadCSV(
        `stockpilot-stock-report-${stamp}.csv`,
        ['SKU', 'Name', 'Category', 'Bhiwandi', 'Pune', 'Ahmedabad', 'Total', 'Min', 'Status', 'Cost Value (INR)', 'Retail Value (INR)'],
        report.rows.map((r) => [
          r.sku,
          r.name,
          r.category,
          r.bhiwandiQty,
          r.puneQty,
          r.ahmedabadQty,
          r.totalQty,
          r.minLevel,
          r.status,
          r.costValue,
          r.retailValue,
        ]),
      );
    } else if (report.type === 'sales') {
      downloadCSV(
        `stockpilot-sales-report-${stamp}.csv`,
        ['Invoice', 'Customer', 'Godown', 'Date', 'Status', 'Payment', 'Subtotal', 'GST', 'Grand Total'],
        report.rows.map((r) => [
          r.invoiceNumber,
          r.customerName,
          r.godownName,
          r.orderDate.slice(0, 10),
          r.status,
          r.paymentStatus,
          r.subtotal,
          r.gstTotal,
          r.grandTotal,
        ]),
      );
    } else {
      downloadCSV(
        `stockpilot-purchase-report-${stamp}.csv`,
        ['PO Number', 'Supplier', 'Godown', 'Order Date', 'Expected Date', 'Status', 'Subtotal', 'GST', 'Grand Total'],
        report.rows.map((r) => [
          r.poNumber,
          r.supplierName,
          r.godownName,
          r.orderDate.slice(0, 10),
          r.expectedDate.slice(0, 10),
          r.status,
          r.subtotal,
          r.gstTotal,
          r.grandTotal,
        ]),
      );
    }
  };

  const handleExportFullInventoryAudit = async () => {
    setExportingAudit(true);
    try {
      const meta = await api.downloadFullStockAuditCsv();
      setLastAuditExport(meta);
      toast.success(
        `Exported ${formatNumber(meta.rowCount)} SKUs (${formatNumber(meta.totalUnits)} units) to ${meta.filename}`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Failed to export full stock inventory CSV',
      );
    } finally {
      setExportingAudit(false);
    }
  };

  const selectedGodownLabel =
    godownId === 'ALL'
      ? 'All godowns'
      : (godowns.find((g) => g.id === godownId)?.name ?? godownId);

  const reportTitleMap: Record<ReportTab, string> = {
    stock: 'Inventory Stock Valuation Report',
    sales: 'GST Sales Register Report',
    purchase: 'Procurement & Purchase Order Report',
  };

  const filterScopeSummary =
    tab === 'stock'
      ? `Category: ${category === 'ALL' ? 'All categories' : category} · Godown: ${selectedGodownLabel}`
      : `Period: ${fromDate || 'Start'} to ${toDate || 'Present'} · Godown: ${selectedGodownLabel}`;

  const printGeneratedLabel = formatDateTime(new Date().toISOString());

  return (
    <div className="space-y-5">
      {/* Executive Print-Only Report Masthead */}
      <div className="print-only print-report-header">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3730a3]">
            StockPilot · Western Electrical Corp
          </div>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#09090b]">
            {reportTitleMap[tab]}
          </h1>
          <div className="mt-1 text-[11px] text-[#52525b]">{filterScopeSummary}</div>
        </div>
        <div className="text-right text-[10px] text-[#52525b]">
          <div className="font-semibold text-[#09090b]">FY 2026–27 · INR (₹)</div>
          <div className="mt-0.5 font-mono tabular-nums">Generated: {printGeneratedLabel}</div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reports</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Audit-ready inventory valuation, GST sales register, and procurement analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            Print / Save PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!report}>
            <Download className="h-3.5 w-3.5" />
            Export view CSV
          </Button>
        </div>
      </div>

      {/* Dedicated External Audit Export Bar (unfiltered full stock inventory) */}
      <section
        aria-label="External audit stock inventory export"
        className="no-print flex flex-col gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              External Audit Stock Export
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Download the complete unfiltered stock inventory across all godowns — includes SKU, HSN code, per-godown quantities, unit cost, GST slab, cost &amp; retail valuation, and last movement timestamp.
            </p>
            {lastAuditExport ? (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Exported {formatNumber(lastAuditExport.rowCount)} SKUs ·{' '}
                  {formatNumber(lastAuditExport.totalUnits)} units across{' '}
                  {lastAuditExport.godownCount} godowns ({formatDateTime(lastAuditExport.generatedAt)})
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          <Button
            size="sm"
            onClick={() => void handleExportFullInventoryAudit()}
            disabled={exportingAudit}
            className="w-full sm:w-auto"
          >
            {exportingAudit ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {exportingAudit ? 'Preparing audit CSV...' : 'Download Full Inventory CSV'}
          </Button>
        </div>
      </section>

      <Tabs.Root
        value={tab}
        onValueChange={(v) => {
          setTab(v as ReportTab);
          setStatus('ALL');
        }}
        className="space-y-5"
      >
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Tabs.List className="inline-flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1">
            <Tabs.Trigger
              value="stock"
              className="rounded-md px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs cursor-pointer"
            >
              Stock report
            </Tabs.Trigger>
            <Tabs.Trigger
              value="sales"
              className="rounded-md px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs cursor-pointer"
            >
              Sales report
            </Tabs.Trigger>
            <Tabs.Trigger
              value="purchase"
              className="rounded-md px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-xs cursor-pointer"
            >
              Purchase report
            </Tabs.Trigger>
          </Tabs.List>

          <div className="flex flex-wrap items-center gap-2">
            {tab === 'stock' ? (
              <Select
                aria-label="Report category filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-auto min-w-[170px]"
              >
                <option value="ALL">All categories</option>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            ) : (
              <>
                <Input
                  type="date"
                  aria-label="Report from date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-auto"
                />
                <Input
                  type="date"
                  aria-label="Report to date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-auto"
                />
              </>
            )}

            <Select
              aria-label="Report godown filter"
              value={godownId}
              onChange={(e) => setGodownId(e.target.value)}
              className="w-auto min-w-[170px]"
            >
              <option value="ALL">All godowns</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => void fetchReport()} />
        ) : loading || !report ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary Cards */}
            {report.type === 'stock' ? (
              <div className="print-summary-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryBox label="SKUs reported" value={formatNumber(report.summary.totalSkus)} />
                <SummaryBox label="Total units" value={formatNumber(report.summary.totalUnits)} />
                <SummaryBox label="Cost valuation" value={formatINR(report.summary.totalCostValue)} />
                <SummaryBox label="Retail valuation" value={formatINR(report.summary.totalRetailValue)} />
              </div>
            ) : report.type === 'sales' ? (
              <div className="print-summary-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryBox label="Invoices" value={formatNumber(report.summary.orderCount)} />
                <SummaryBox label="Total revenue" value={formatINR(report.summary.totalRevenue)} />
                <SummaryBox label="Total GST collected" value={formatINR(report.summary.totalGst)} />
                <SummaryBox label="Avg. invoice value" value={formatINR(report.summary.avgOrderValue)} />
              </div>
            ) : (
              <div className="print-summary-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryBox label="Purchase orders" value={formatNumber(report.summary.orderCount)} />
                <SummaryBox label="Received / Pending" value={`${report.summary.receivedCount} / ${report.summary.pendingCount}`} />
                <SummaryBox label="Total procurement" value={formatINR(report.summary.totalSpend)} />
                <SummaryBox label="Input GST credit" value={formatINR(report.summary.totalGst)} />
              </div>
            )}

            {/* Bar Chart */}
            <div className="print-chart-card rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                {report.type === 'stock'
                  ? 'Inventory Cost Valuation by Category'
                  : report.type === 'sales'
                    ? 'Recent Invoiced Revenue Distribution'
                    : 'Procurement Spend by Supplier'}
              </h2>
              {/* Interactive Responsive Chart (Screen) */}
              <div className="no-print h-60 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={report.chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                      }}
                      formatter={(val) => [formatINR(Number(val ?? 0)), 'Amount']}
                    />
                    <Bar
                      dataKey="value"
                      fill="#4f46e5"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Deterministic Vector Chart (Print / PDF) */}
              <div className="print-only print-chart-svg">
                <BarChart
                  width={680}
                  height={205}
                  data={report.chart}
                  margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#3f3f46' }}
                    axisLine={{ stroke: '#d4d4d8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatINRCompact(v)}
                    tick={{ fontSize: 10, fill: '#3f3f46' }}
                    axisLine={false}
                    tickLine={false}
                    width={84}
                  />
                  <Bar
                    dataKey="value"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                    isAnimationActive={false}
                  />
                </BarChart>
              </div>
            </div>

            {/* Report Table */}
            <div className="print-table-wrapper overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div className="print-table-scroll overflow-x-auto">
                {report.type === 'stock' ? (
                  <table className="print-table w-full text-left text-xs">
                    <thead className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 text-[var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">SKU</th>
                        <th className="px-4 py-2.5 font-medium">Item</th>
                        <th className="px-4 py-2.5 font-medium text-right">BHI</th>
                        <th className="px-4 py-2.5 font-medium text-right">PUN</th>
                        <th className="px-4 py-2.5 font-medium text-right">AMD</th>
                        <th className="px-4 py-2.5 font-medium text-right">Total</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Cost value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)]">
                      {report.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 font-mono text-[var(--accent-primary)]">{r.sku}</td>
                          <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{r.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{r.bhiwandiQty}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{r.puneQty}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{r.ahmedabadQty}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{r.totalQty}</td>
                          <td className="px-4 py-2.5">{stockStatusBadge(r.status)}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatINR(r.costValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : report.type === 'sales' ? (
                  <table className="print-table w-full text-left text-xs">
                    <thead className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 text-[var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Invoice</th>
                        <th className="px-4 py-2.5 font-medium">Customer</th>
                        <th className="px-4 py-2.5 font-medium">Date</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium">Payment</th>
                        <th className="px-4 py-2.5 font-medium text-right">GST</th>
                        <th className="px-4 py-2.5 font-medium text-right">Grand total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)]">
                      {report.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 font-mono text-[var(--accent-primary)]">{r.invoiceNumber}</td>
                          <td className="px-4 py-2.5 font-medium">{r.customerName}</td>
                          <td className="px-4 py-2.5 font-mono tabular-nums">{formatDate(r.orderDate)}</td>
                          <td className="px-4 py-2.5">{soStatusBadge(r.status)}</td>
                          <td className="px-4 py-2.5">{paymentStatusBadge(r.paymentStatus)}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatINR(r.gstTotal)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{formatINR(r.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="print-table w-full text-left text-xs">
                    <thead className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 text-[var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">PO Number</th>
                        <th className="px-4 py-2.5 font-medium">Supplier</th>
                        <th className="px-4 py-2.5 font-medium">Godown</th>
                        <th className="px-4 py-2.5 font-medium">Order date</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">GST</th>
                        <th className="px-4 py-2.5 font-medium text-right">Grand total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)]">
                      {report.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 font-mono text-[var(--accent-primary)]">{r.poNumber}</td>
                          <td className="px-4 py-2.5 font-medium">{r.supplierName}</td>
                          <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.godownName}</td>
                          <td className="px-4 py-2.5 font-mono tabular-nums">{formatDate(r.orderDate)}</td>
                          <td className="px-4 py-2.5">{poStatusBadge(r.status)}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatINR(r.gstTotal)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{formatINR(r.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Print-Only Audit Footer */}
            <div className="print-only print-report-footer">
              <span>StockPilot Inventory Management · Western Electrical Corp</span>
              <span>
                {formatNumber(report.rows.length)} records · All monetary values in INR (₹)
              </span>
            </div>
          </div>
        )}
      </Tabs.Root>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-card rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}
