import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/http/server';
import { AppPaths } from '@/routes/routes';
import { PlayNavbar } from './_components';
import { buildPath } from '@/routes/routeHelpers';

export default async function PlayLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(buildPath(AppPaths.login, { redirect: AppPaths.play }));
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <PlayNavbar email={user.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
