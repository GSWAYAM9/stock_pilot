import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils.ts';
import { Button, EmptyState, Skeleton } from './primitives.tsx';

export interface DataTableColumn<TData> {
  id: string;
  header: string;
  align?: 'left' | 'right';
  sortValue?: (row: TData) => string | number;
  cell: (row: TData) => ReactNode;
}

interface DataTableProps<TData extends { id: string }> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (nextPage: number) => void;
}

export function DataTable<TData extends { id: string }>({
  data,
  columns,
  loading = false,
  onRowClick,
  emptyTitle = 'No matching records',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  emptyAction,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: DataTableProps<TData>) {
  const [sortState, setSortState] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortState) return data;
    const col = columns.find((c) => c.id === sortState.id);
    if (!col?.sortValue) return data;
    const getter = col.sortValue;
    const factor = sortState.dir === 'asc' ? 1 : -1;
    return data.slice().sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * factor;
      }
      return String(va).localeCompare(String(vb)) * factor;
    });
  }, [data, columns, sortState]);

  const toggleSort = (colId: string) => {
    setSortState((prev) => {
      if (!prev || prev.id !== colId) return { id: colId, dir: 'asc' };
      if (prev.dir === 'asc') return { id: colId, dir: 'desc' };
      return null;
    });
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 px-4 py-3">
          <div className="flex gap-6">
            {columns.slice(0, 5).map((col) => (
              <Skeleton key={col.id} className="h-3.5 w-24" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-[var(--border-hairline)]">
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-56 flex-1 max-w-xs" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/90 backdrop-blur-xs">
            <tr>
              {columns.map((col) => {
                const canSort = Boolean(col.sortValue);
                const activeDir = sortState?.id === col.id ? sortState.dir : null;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={cn(
                      'px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap select-none',
                      col.align === 'right' && 'text-right',
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer',
                          col.align === 'right' && 'ml-auto',
                        )}
                      >
                        {col.header}
                        {activeDir === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-[var(--accent-primary)]" />
                        ) : activeDir === 'desc' ? (
                          <ArrowDown className="h-3 w-3 text-[var(--accent-primary)]" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)]">
            {sortedData.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'transition-colors duration-100',
                  onRowClick &&
                    'cursor-pointer hover:bg-[var(--bg-hover)]/80 focus-visible:bg-[var(--bg-hover)]',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-4 py-3 align-middle text-[var(--text-primary)]',
                      col.align === 'right' && 'text-right',
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange ? (
        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 px-4 py-2.5 text-xs text-[var(--text-muted)]">
          <span className="tabular-nums">
            Page {page} of {totalPages}
            {totalItems !== undefined ? ` · ${totalItems} total` : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
