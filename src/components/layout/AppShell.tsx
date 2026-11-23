import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  BarChart3,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NAV_ITEMS, type AppModuleId } from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';
import { BrandMark } from './BrandMark.tsx';

const MODULE_ICONS: Record<AppModuleId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  sales: ShoppingCart,
  purchases: Truck,
  stock: Package,
  godowns: Warehouse,
  reports: BarChart3,
  customers: Users,
  suppliers: Building2,
};

const MODULE_TITLES: Record<AppModuleId, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales Orders',
  purchases: 'Purchase Orders',
  stock: 'Stock Inventory',
  godowns: 'Godowns',
  reports: 'Reports',
  customers: 'Customers',
  suppliers: 'Suppliers',
};

interface AppShellProps {
  activeModule: AppModuleId;
  onNavigate: (module: AppModuleId) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenCommand: () => void;
  onResetDemo: () => Promise<void>;
  lowStockBadgeCount?: number;
  children: ReactNode;
}

export function AppShell({
  activeModule,
  onNavigate,
  theme,
  onToggleTheme,
  onOpenCommand,
  onResetDemo,
  lowStockBadgeCount = 0,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const groups: Array<'Operations' | 'Inventory' | 'Directory'> = [
    'Operations',
    'Inventory',
    'Directory',
  ];

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetDemo();
    } finally {
      setResetting(false);
    }
  };

  const renderNavItems = (isMobile = false) => (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
      {groups.map((group) => {
        const groupItems = NAV_ITEMS.filter((n) => n.group === group);
        return (
          <div key={group}>
            {!collapsed || isMobile ? (
              <div className="mb-1.5 px-2.5 text-[11px] font-medium text-[var(--text-muted)]">
                {group}
              </div>
            ) : null}
            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const Icon = MODULE_ICONS[item.id];
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      if (isMobile) setMobileOpen(false);
                    }}
                    title={collapsed && !isMobile ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap',
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
                      collapsed && !isMobile && 'justify-center px-0',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed || isMobile ? (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.id === 'stock' && lowStockBadgeCount > 0 ? (
                          <span className="font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                            {lowStockBadgeCount}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'no-print hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] transition-[width] duration-200',
          collapsed ? 'w-[68px]' : 'w-[244px]',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border-hairline)] px-4">
          <BrandMark collapsed={collapsed} />
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {renderNavItems(false)}

        <div className="border-t border-[var(--border-hairline)] p-3">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="flex h-9 w-full items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          ) : (
            <div className="px-2 py-1 text-[11px] text-[var(--text-muted)]">
              <div className="font-medium text-[var(--text-secondary)] truncate">
                Western Electrical Corp
              </div>
              <div className="mt-0.5 truncate">FY 2026–27 · INR (₹)</div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Nav */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-64 max-w-[80vw] flex-col border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[var(--border-hairline)] px-4">
              <BrandMark />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNavItems(true)}
          </aside>
        </div>
      ) : null}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col workspace-atmosphere">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[var(--border-hairline)] bg-[var(--glass-bg)] px-4 backdrop-blur-md sm:px-6">
          {/* Left: Mobile trigger + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="hidden sm:inline text-[var(--text-muted)] whitespace-nowrap">
                StockPilot
              </span>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="font-semibold text-[var(--text-primary)] truncate">
                {MODULE_TITLES[activeModule]}
              </span>
            </nav>
          </div>

          {/* Right: Global Search (Cmd+K) + Theme + Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCommand}
              aria-label="Search or jump to command"
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors cursor-pointer sm:w-60 justify-between"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline truncate">Search SKUs, orders...</span>
              </span>
              <kbd className="hidden sm:inline rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Workspace settings"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 w-56 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1.5 shadow-xl"
                >
                  <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                    Workspace Settings
                  </DropdownMenu.Label>
                  <DropdownMenu.Item
                    onSelect={onToggleTheme}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] focus:bg-[var(--bg-subtle)] focus:outline-none cursor-pointer"
                  >
                    {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--border-hairline)]" />
                  <DropdownMenu.Item
                    disabled={resetting}
                    onSelect={() => void handleReset()}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:outline-none cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {resetting ? 'Resetting demo data...' : 'Reset demo data'}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1520px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
