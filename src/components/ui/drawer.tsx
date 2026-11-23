import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.ts';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg' | 'xl';
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const sizeWidth = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  size = 'lg',
  headerExtra,
  children,
  footer,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity duration-150" />
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[var(--border-hairline)] bg-[var(--drawer-bg)] backdrop-blur-md shadow-2xl focus:outline-none',
            sizeWidth[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerExtra}
              <Dialog.Close
                aria-label="Close panel"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer ? (
            <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-4">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidthClass = 'max-w-lg',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl focus:outline-none',
            maxWidthClass,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Close dialog"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="max-h-[80vh] overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
