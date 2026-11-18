import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names (clsx: strings, conditionals, arrays) and resolves Tailwind
 * conflicts so the last one wins: `cn('bg-brand-600', 'bg-error')` is `'bg-error'`.
 * Components pass their own classes first and the caller's `className` last.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
