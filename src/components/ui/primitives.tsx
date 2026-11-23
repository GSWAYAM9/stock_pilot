import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn, getInitials } from '../../lib/utils.ts';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] border border-transparent shadow-xs',
  secondary:
    'bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)]',
  outline:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] border border-transparent',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 border border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  icon: 'h-9 w-9 p-0 justify-center',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'info';

const toneStyles: Record<StatusTone, { wrap: string; dot: string }> = {
  ok: {
    wrap: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/8 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warn: {
    wrap: 'text-amber-700 dark:text-amber-400 bg-amber-500/8 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  danger: {
    wrap: 'text-rose-700 dark:text-rose-400 bg-rose-500/8 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  info: {
    wrap: 'text-indigo-700 dark:text-indigo-400 bg-indigo-500/8 border-indigo-500/20',
    dot: 'bg-indigo-500',
  },
  neutral: {
    wrap: 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/8 border-zinc-500/20',
    dot: 'bg-zinc-400',
  },
};

export function StatusBadge({
  label,
  tone = 'neutral',
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  const style = toneStyles[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        style.wrap,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

export function stockStatusBadge(status: 'IN_STOCK' | 'LOW' | 'OUT') {
  if (status === 'OUT') return <StatusBadge label="Out of stock" tone="danger" />;
  if (status === 'LOW') return <StatusBadge label="Low stock" tone="warn" />;
  return <StatusBadge label="In stock" tone="ok" />;
}

export function poStatusBadge(status: 'PENDING' | 'RECEIVED' | 'CANCELLED') {
  if (status === 'RECEIVED') return <StatusBadge label="Received" tone="ok" />;
  if (status === 'CANCELLED') return <StatusBadge label="Cancelled" tone="danger" />;
  return <StatusBadge label="Pending" tone="warn" />;
}

export function soStatusBadge(status: 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED') {
  if (status === 'FULFILLED') return <StatusBadge label="Fulfilled" tone="ok" />;
  if (status === 'CONFIRMED') return <StatusBadge label="Confirmed" tone="info" />;
  if (status === 'CANCELLED') return <StatusBadge label="Cancelled" tone="danger" />;
  return <StatusBadge label="Draft" tone="neutral" />;
}

export function paymentStatusBadge(status: 'UNPAID' | 'PARTIAL' | 'PAID') {
  if (status === 'PAID') return <StatusBadge label="Paid" tone="ok" />;
  if (status === 'PARTIAL') return <StatusBadge label="Partial" tone="warn" />;
  return <StatusBadge label="Unpaid" tone="neutral" />;
}

export function AvatarInitials({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)]',
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800/70', className)}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)]">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/5 px-6 py-10 text-center"
    >
      <AlertCircle className="mb-2 h-6 w-6 text-rose-500" />
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Unable to load data</h3>
      <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
