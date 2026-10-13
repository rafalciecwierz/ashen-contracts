import type { ReactNode } from 'react';

export interface NavbarProps {
  /** Left slot — usually the logo. */
  left?: ReactNode;
  /** Center slot — e.g. the energy bar, once it exists. */
  center?: ReactNode;
  /** Right slot — user menu when logged in, login/register buttons otherwise. */
  right?: ReactNode;
}

// Purely presentational: knows nothing about auth. What goes into each slot is
// decided by the app, so the same Navbar serves the public landing page and /play.
export function Navbar({ left, center, right }: NavbarProps) {
  return (
    <header className="flex items-center gap-4 border-b border-surface-raised bg-surface px-4 py-3">
      <div className="flex flex-1 items-center justify-start">{left}</div>
      <div className="flex flex-1 items-center justify-center">{center}</div>
      <div className="flex flex-1 items-center justify-end gap-2">{right}</div>
    </header>
  );
}
