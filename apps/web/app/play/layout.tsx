import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/src/http/getCurrentUser';
import { AppPaths, buildPath } from '@/src/routes/routes';

export default async function PlayLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(buildPath(AppPaths.login, { redirect: AppPaths.play }));
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Temporary bar — replaced by the Navbar in the next step. */}
      <header className="border-b border-surface-raised px-4 py-3 text-sm text-ink-muted">
        {user.email}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}