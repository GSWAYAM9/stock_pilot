import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { DirectoryView } from './components/directory/DirectoryView.tsx';
import { GodownsView } from './components/godowns/GodownsView.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { CommandPalette } from './components/layout/CommandPalette.tsx';
import type { PurchasePrefill } from './components/purchases/NewPurchaseSheet.tsx';
import { PurchasesView } from './components/purchases/PurchasesView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { SalesView } from './components/sales/SalesView.tsx';
import { StockView } from './components/stock/StockView.tsx';
import { api } from './lib/api.ts';
import { NAV_ITEMS, type AppModuleId } from './lib/constants.ts';
import type { ItemWithStock } from './server/types.ts';

function parseModuleFromPath(): AppModuleId {
  const seg = window.location.pathname.replace(/^\/+/, '').split('/')[0] as AppModuleId;
  return NAV_ITEMS.some((n) => n.id === seg) ? seg : 'dashboard';
}

export default function App() {
  const [activeModule, setActiveModule] = useState<AppModuleId>(() => parseModuleFromPath());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('stockpilot-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      // default to crisp light mode as confirmed
    }
    return 'light';
  });

  const [commandOpen, setCommandOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [lowStockBadgeCount, setLowStockBadgeCount] = useState(0);

  // Cross-module deep-link state
  const [initialItemId, setInitialItemId] = useState<string | null>(null);
  const [initialPoId, setInitialPoId] = useState<string | null>(null);
  const [initialSoId, setInitialSoId] = useState<string | null>(null);
  const [prefillNewPo, setPrefillNewPo] = useState<PurchasePrefill | null>(null);
  const [openNewSaleTrigger, setOpenNewSaleTrigger] = useState(0);
  const [openNewPoTrigger, setOpenNewPoTrigger] = useState(0);

  // Sync light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('stockpilot-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Sync browser history popstate
  useEffect(() => {
    const onPop = () => setActiveModule(parseModuleFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Refresh sidebar low-stock badge count whenever data mutates
  useEffect(() => {
    api
      .getDashboard(30)
      .then((d) => setLowStockBadgeCount(d.kpis.lowStockCount.value))
      .catch(() => {});
  }, [refreshSignal]);

  const navigate = useCallback((mod: AppModuleId, detailId?: string) => {
    setActiveModule(mod);
    const nextPath = mod === 'dashboard' ? '/' : `/${mod}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    if (detailId) {
      if (mod === 'stock') setInitialItemId(detailId);
      if (mod === 'purchases') setInitialPoId(detailId);
      if (mod === 'sales') setInitialSoId(detailId);
    }
  }, []);

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const triggerGlobalRefresh = useCallback(() => {
    setRefreshSignal((n) => n + 1);
  }, []);

  const handleResetDemo = useCallback(async () => {
    await api.resetDemo();
    toast.success('Demo dataset reset to clean 90-day baseline');
    triggerGlobalRefresh();
  }, [triggerGlobalRefresh]);

  const handleCreatePoFromAlert = useCallback(
    (prefill: PurchasePrefill) => {
      setPrefillNewPo(prefill);
      navigate('purchases');
    },
    [navigate],
  );

  const handleCreatePoForItem = useCallback(
    (item: ItemWithStock) => {
      const suggested = Math.max(item.minLevel * 2 - item.totalQty, item.minLevel);
      setPrefillNewPo({
        itemId: item.id,
        supplierId: item.preferredSupplierId,
        qty: suggested,
        unitCost: item.costPrice,
      });
      navigate('purchases');
    },
    [navigate],
  );

  const handleQuickAction = useCallback(
    (action: 'new-sale' | 'new-po' | 'toggle-theme') => {
      if (action === 'toggle-theme') {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
      } else if (action === 'new-sale') {
        navigate('sales');
        setOpenNewSaleTrigger((n) => n + 1);
      } else if (action === 'new-po') {
        navigate('purchases');
        setOpenNewPoTrigger((n) => n + 1);
      }
    },
    [navigate],
  );

  return (
    <>
      <AppShell
        activeModule={activeModule}
        onNavigate={(m) => navigate(m)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenCommand={() => setCommandOpen(true)}
        onResetDemo={handleResetDemo}
        lowStockBadgeCount={lowStockBadgeCount}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeModule === 'dashboard' ? (
              <DashboardView
                onNavigate={navigate}
                onCreatePoFromAlert={handleCreatePoFromAlert}
                onQuickNewSale={() => handleQuickAction('new-sale')}
                refreshSignal={refreshSignal}
              />
            ) : activeModule === 'stock' ? (
              <StockView
                initialItemId={initialItemId}
                onClearInitialItem={() => setInitialItemId(null)}
                onNavigateOrder={(type, id) =>
                  navigate(type === 'PO' ? 'purchases' : 'sales', id)
                }
                onCreatePoForItem={handleCreatePoForItem}
                onStockMutated={triggerGlobalRefresh}
                refreshSignal={refreshSignal}
              />
            ) : activeModule === 'purchases' ? (
              <PurchasesView
                initialOrderId={initialPoId}
                onClearInitialOrder={() => setInitialPoId(null)}
                prefillNewPo={prefillNewPo}
                onClearPrefill={() => setPrefillNewPo(null)}
                openNewTrigger={openNewPoTrigger}
                onOrderMutated={triggerGlobalRefresh}
                refreshSignal={refreshSignal}
              />
            ) : activeModule === 'sales' ? (
              <SalesView
                initialOrderId={initialSoId}
                onClearInitialOrder={() => setInitialSoId(null)}
                openNewTrigger={openNewSaleTrigger}
                onOrderMutated={triggerGlobalRefresh}
                refreshSignal={refreshSignal}
              />
            ) : activeModule === 'reports' ? (
              <ReportsView refreshSignal={refreshSignal} />
            ) : activeModule === 'godowns' ? (
              <GodownsView
                onStockMutated={triggerGlobalRefresh}
                refreshSignal={refreshSignal}
              />
            ) : activeModule === 'customers' ? (
              <DirectoryView mode="customers" refreshSignal={refreshSignal} />
            ) : (
              <DirectoryView mode="suppliers" refreshSignal={refreshSignal} />
            )}
          </motion.div>
        </AnimatePresence>
      </AppShell>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={navigate}
        onQuickAction={handleQuickAction}
      />

      <Toaster
        position="bottom-right"
        theme={theme}
        richColors
        closeButton
        toastOptions={{
          className: 'font-sans text-xs',
        }}
      />
    </>
  );
}
