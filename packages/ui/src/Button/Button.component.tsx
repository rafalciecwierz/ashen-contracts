import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const variantStyles = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-ink border-transparent',
  secondary: 'bg-transparent hover:bg-surface-raised text-brand-400 border-brand-500',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`px-5 py-2 rounded font-semibold font-body border cursor-pointer transition-colors ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}