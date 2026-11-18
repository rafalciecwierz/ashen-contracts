import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-ink border-transparent',
  secondary:
    'bg-transparent hover:bg-surface-raised text-brand-400 border-brand-500',
};

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'px-5 py-2 rounded font-semibold font-body border cursor-pointer transition-colors',
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
