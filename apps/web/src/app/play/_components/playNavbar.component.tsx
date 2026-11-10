'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navbar, UserMenu } from '@ashen-contracts/ui';
import { AppPaths } from '@/routes/routes';
import { logout } from '../play.actions';

interface PlayNavbarProps {
  email: string;
}

export function PlayNavbar({ email }: PlayNavbarProps) {
  const t = useTranslations('nav');
  const [isLoggingOut, startTransition] = useTransition();
  const [logoutFailed, setLogoutFailed] = useState(false);

  function onLogout(): void {
    if (isLoggingOut) return;
    setLogoutFailed(false);
    startTransition(async () => {
      try {
        await logout();
      } catch (error) {
        unstable_rethrow(error);
        console.error('Logout failed', error);
        setLogoutFailed(true);
      }
    });
  }

  return (
    <Navbar
      left={
        <Link href={AppPaths.play} className="font-heading text-lg text-ink">
          Ashen Contracts
        </Link>
      }
      right={
        <>
          {logoutFailed && (
            <p role="alert" className="text-sm text-error">
              {t('logoutFailed')}
            </p>
          )}
          <UserMenu
            name={t('unnamedHero')}
            description={email}
            items={[{ label: t('logout'), onSelect: onLogout }]}
          />
        </>
      }
    />
  );
}
