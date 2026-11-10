import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AppPaths } from '@/routes/routes';

export default async function Home() {
  const t = await getTranslations('home');

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-heading">{t('title')}</h1>
        <p className="text-ink-muted">{t('tagline')}</p>
        <div className="flex gap-3">
          <Link
            href={AppPaths.register}
            className="px-5 py-2 rounded font-semibold border border-transparent bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            {t('start')}
          </Link>
          <Link
            href={AppPaths.login}
            className="px-5 py-2 rounded font-semibold border border-brand-500 text-brand-400 hover:bg-surface-raised transition-colors"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    </main>
  );
}
