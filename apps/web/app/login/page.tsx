import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AppPaths } from '@/src/routes/routes';
import { getCurrentUser } from '@/src/http/getCurrentUser';
import { getSafeRedirect } from '@/src/routes/routeHelpers';
import { LoginForm } from './_components/loginForm.component';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  // Already logged in → no reason to show the form. Same helper as the /play
  // layout uses, so the two pages always agree on what "logged in" means
  // (that agreement is what prevents a /login <-> /play redirect loop).
  const user = await getCurrentUser();
  if (user) {
    const { redirect: redirectParam } = await searchParams;
    const target = typeof redirectParam === 'string' ? getSafeRedirect(redirectParam) : null;
    redirect(target ?? AppPaths.play);
  }

  // LoginForm reads useSearchParams(), which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}