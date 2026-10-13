'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navbar, UserMenu } from '@ashen-contracts/ui';
import { InternalApiRoutes, apiPost } from '@/src/http';
import { AppPaths } from '@/src/routes/routes';

interface PlayNavbarProps {
  email: string;
}

export function PlayNavbar({ email }: PlayNavbarProps) {
  const router = useRouter();
  const t = useTranslations('nav');

  async function handleLogout() {
    await apiPost(InternalApiRoutes.auth.logout, {});
    router.replace(AppPaths.login);
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
          <div className="font-heading text-lg text-ink">
            {t('unnamedHero')}
          </div>
          <UserMenu
            name={t('unnamedHero')}
            description={email}
            items={[{ label: t('logout'), onSelect: handleLogout }]}
          />
        </>
      }
    />
  );
}
