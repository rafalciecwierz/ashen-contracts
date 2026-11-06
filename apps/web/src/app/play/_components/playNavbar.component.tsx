'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Navbar, UserMenu } from '@ashen-contracts/ui';
import { AppPaths } from '@/routes/routes';
import { logout } from '../play.actions';

interface PlayNavbarProps {
  email: string;
}

export function PlayNavbar({ email }: PlayNavbarProps) {
  const t = useTranslations('nav');

  return (
    <Navbar
      left={
        <Link href={AppPaths.play} className="font-heading text-lg text-ink">
          Ashen Contracts
        </Link>
      }
      right={
        <>
          <div className="font-heading text-lg text-ink">
            {t('unnamedHero')}
          </div>
          <UserMenu
            name={t('unnamedHero')}
            description={email}
            items={[{ label: t('logout'), onSelect: () => void logout() }]}
          />
        </>
      }
    />
  );
}
