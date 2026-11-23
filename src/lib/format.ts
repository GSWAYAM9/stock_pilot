export type StockStatus = 'IN_STOCK' | 'LOW' | 'OUT';
export type GstSlab = 5 | 12 | 18;

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

export function formatINR(amount: number, precise = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return precise ? inrPreciseFormatter.format(safe) : inrFormatter.format(Math.round(safe));
}

export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  }
  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  }
  return formatINR(amount);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

/**
 * Single authoritative low-stock rule shared across server and UI:
 * qty === 0 -> OUT, qty <= minLevel -> LOW, otherwise IN_STOCK.
 */
export function statusFor(qty: number, minLevel: number): StockStatus {
  if (qty <= 0) return 'OUT';
  if (qty <= minLevel) return 'LOW';
  return 'IN_STOCK';
}

export interface LineCalcInput {
  qty: number;
  unitPrice: number;
  gstRate: GstSlab;
}

export interface LineCalcResult {
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  lineTotal: number;
}

export function calculateLineTotals(line: LineCalcInput): LineCalcResult {
  const taxableAmount = roundMoney(line.qty * line.unitPrice);
  const gstAmount = roundMoney((taxableAmount * line.gstRate) / 100);
  const cgstAmount = roundMoney(gstAmount / 2);
  const sgstAmount = roundMoney(gstAmount - cgstAmount);
  const lineTotal = roundMoney(taxableAmount + gstAmount);
  return { taxableAmount, gstAmount, cgstAmount, sgstAmount, lineTotal };
}

export interface OrderTotals {
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  gstTotal: number;
  grandTotal: number;
}

export function calculateOrderTotals(lines: LineCalcInput[]): OrderTotals {
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;

  for (const line of lines) {
    const calc = calculateLineTotals(line);
    subtotal += calc.taxableAmount;
    cgstTotal += calc.cgstAmount;
    sgstTotal += calc.sgstAmount;
  }

  subtotal = roundMoney(subtotal);
  cgstTotal = roundMoney(cgstTotal);
  sgstTotal = roundMoney(sgstTotal);
  const gstTotal = roundMoney(cgstTotal + sgstTotal);
  const grandTotal = roundMoney(subtotal + gstTotal);

  return { subtotal, cgstTotal, sgstTotal, gstTotal, grandTotal };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateFormatter.format(parsed);
}

export function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateTimeFormatter.format(parsed);
}

export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const parsed = new Date(iso).getTime();
  if (Number.isNaN(parsed)) return '—';
  const diffSec = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(iso);
}

export function buildCSV(
  headers: string[],
  rows: Array<Array<string | number>>,
  options?: { includeBom?: boolean },
): string {
  const escapeCell = (val: string | number): string => {
    if (typeof val === 'number') {
      return Number.isFinite(val) ? String(val) : '';
    }
    let str = String(val ?? '');
    // Prevent CSV formula injection in Excel/Sheets for untrusted text fields
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const body = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\r\n');
  return options?.includeBom ? `\uFEFF${body}` : body;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): void {
  const csv = buildCSV(headers, rows, { includeBom: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
