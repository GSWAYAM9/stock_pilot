import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  Building2,
  FileText,
  Package,
  Plus,
  Search,
  ShoppingCart,
  SunMoon,
  Truck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type GlobalSearchResult } from '../../lib/api.ts';
import { NAV_ITEMS, type AppModuleId } from '../../lib/constants.ts';
import { formatINR } from '../../lib/format.ts';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (module: AppModuleId, detailId?: string) => void;
  onQuickAction: (action: 'new-sale' | 'new-po' | 'toggle-theme') => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onQuickAction,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .search(query)
        .then((res) => {
          if (active) setResults(res);
        })
        .catch(() => {
          if (active) setResults(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const filteredModules = NAV_ITEMS.filter((n) =>
    n.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const selectAndClose = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[14%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl focus:outline-none">
          <Dialog.Title className="sr-only">Command palette search</Dialog.Title>
          <Dialog.Description className="sr-only">
            Jump to any module, inventory SKU, sales invoice, purchase order, or quick action.
          </Dialog.Description>
          <div className="flex items-center gap-3 border-b border-[var(--border-hairline)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to module, SKU, invoice, PO, customer, or action..."
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <kbd className="rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
              ESC
            </kbd>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2 space-y-3">
            {/* Quick Actions */}
            <div>
              <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                Quick actions
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => selectAndClose(() => onQuickAction('new-sale'))}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Plus className="h-4 w-4 text-[var(--accent-primary)]" />
                    Create new sales invoice
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => selectAndClose(() => onQuickAction('new-po'))}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-[var(--accent-primary)]" />
                    Raise new purchase order
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => selectAndClose(() => onQuickAction('toggle-theme'))}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <SunMoon className="h-4 w-4 text-[var(--text-muted)]" />
                    Toggle Light / Dark theme
                  </span>
                </button>
              </div>
            </div>

            {/* Modules */}
            {filteredModules.length > 0 ? (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Modules
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {filteredModules.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => selectAndClose(() => onNavigate(mod.id))}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <span>{mod.label}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {mod.shortcut}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Stock Items */}
            {results && results.items.length > 0 ? (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Inventory items
                </div>
                <div className="space-y-0.5">
                  {results.items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => selectAndClose(() => onNavigate('stock', it.id))}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Package className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <span className="font-mono text-xs text-[var(--accent-primary)] shrink-0">
                          {it.sku}
                        </span>
                        <span className="truncate text-[var(--text-primary)]">{it.name}</span>
                      </span>
                      <span className="text-xs text-[var(--text-muted)] shrink-0">
                        {it.category.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Orders */}
            {results && (results.purchases.length > 0 || results.sales.length > 0) ? (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Orders
                </div>
                <div className="space-y-0.5">
                  {results.purchases.slice(0, 3).map((po) => (
                    <button
                      key={po.id}
                      type="button"
                      onClick={() => selectAndClose(() => onNavigate('purchases', po.id))}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <span className="font-mono text-xs">{po.poNumber}</span>
                        <span className="truncate text-[var(--text-muted)]">{po.supplierName}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums shrink-0">
                        {formatINR(po.grandTotal)}
                      </span>
                    </button>
                  ))}
                  {results.sales.slice(0, 3).map((so) => (
                    <button
                      key={so.id}
                      type="button"
                      onClick={() => selectAndClose(() => onNavigate('sales', so.id))}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <ShoppingCart className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <span className="font-mono text-xs">{so.invoiceNumber}</span>
                        <span className="truncate text-[var(--text-muted)]">{so.customerName}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums shrink-0">
                        {formatINR(so.grandTotal)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Directory */}
            {results && (results.customers.length > 0 || results.suppliers.length > 0) ? (
              <div>
                <div className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Directory
                </div>
                <div className="space-y-0.5">
                  {results.customers.slice(0, 2).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectAndClose(() => onNavigate('customers'))}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        {c.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{c.city}</span>
                    </button>
                  ))}
                  {results.suppliers.slice(0, 2).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectAndClose(() => onNavigate('suppliers'))}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        {s.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{s.city}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading &&
            filteredModules.length === 0 &&
            results &&
            results.items.length === 0 &&
            results.sales.length === 0 &&
            results.purchases.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
