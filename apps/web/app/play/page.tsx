import { getTranslations } from 'next-intl/server';

export default async function PlayPage() {
  const t = await getTranslations('play');

  return (
    <main className="px-4 py-8">
      <h1 className="text-xl font-heading text-ink">{t('title')}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t('body')}</p>
    </main>
  );
}