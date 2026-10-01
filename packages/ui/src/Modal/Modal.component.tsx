import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-bg/80" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-lg bg-surface border border-surface-raised p-6 shadow-xl font-body text-ink">
          <Dialog.Title className="text-lg font-heading text-ink mb-1">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="text-sm text-ink-muted mb-4">
              {description}
            </Dialog.Description>
          )}
          {children}
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute top-3 right-3 text-ink-muted hover:text-ink transition-colors"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}