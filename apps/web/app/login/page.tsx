'use client';

import { Suspense, useState, type SubmitEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input, Button } from '@ashen-contracts/ui';
import type { LoginResponse } from '@ashen-contracts/shared';
import { loginSchema } from './login.schema';
import type { LoginFieldErrors } from './login.types';
import { AppPaths } from '@/src/routes/routes';
import { InternalApiRoutes, ApiError, apiPost } from '@/src/http';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Two things this page's copy/behavior depends on:
  // - ?registered=true  → the user just created an account, greet them accordingly
  // - ?redirect=/some/path → they were bounced here from a protected route;
  //   send them back there after a successful login instead of the default.
  const registered = searchParams.get('registered') === 'true';
  const redirectTarget = searchParams.get('redirect');

  const t = useTranslations('auth.login');
  const tValidation = useTranslations('validation');
  const tErrors = useTranslations('errors');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = loginSchema.safeParse({ email, password });
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: LoginFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof LoginFieldErrors;
      if (!errors[field]) errors[field] = issue.message;
    }
    setFieldErrors(errors);
    return false;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await apiPost(InternalApiRoutes.auth.login, { email, password });
      router.push(redirectTarget ?? AppPaths.home);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? tErrors(err.code ?? 'GENERIC') : tErrors('GENERIC'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-heading text-ink mb-1">
            {registered ? t('registeredTitle') : t('unauthorizedTitle')}
          </h1>
          <p className="text-sm text-ink-muted">
            {registered ? t('registeredBody') : t('unauthorizedBody')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-surface-raised rounded-lg p-6 flex flex-col gap-4"
        >
          <Input
            label={t('emailLabel')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email ? tValidation(fieldErrors.email) : undefined}
          />
          <Input
            label={t('passwordLabel')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password ? tValidation(fieldErrors.password) : undefined}
          />

          {serverError && <p className="text-sm text-error">{serverError}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}

// useSearchParams() requires a Suspense boundary — without it, Next.js
// deopts the whole page (or the build warns/fails depending on config).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}