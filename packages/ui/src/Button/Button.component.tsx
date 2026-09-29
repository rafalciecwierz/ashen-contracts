import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', style, children, ...rest }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    padding: '0.5rem 1.25rem',
    borderRadius: '4px',
    border: 'none',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: variant === 'primary' ? '#7c3aed' : 'transparent',
    color: variant === 'primary' ? '#fff' : '#7c3aed',
    boxShadow: variant === 'primary' ? 'none' : 'inset 0 0 0 1px #7c3aed',
  };

  return (
    <button style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </button>
  );
}