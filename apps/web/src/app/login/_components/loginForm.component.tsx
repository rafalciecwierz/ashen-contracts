'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input, Button } from '@ashen-contracts/ui';
import { loginForm } from '../login.schema';
import { login } from '../login.actions';
import { useFormAction } from '@/forms/useFormAction';
import { getSafeRedirect } from '@/routes/routeHelpers';

export function LoginForm() {
  const searchParams = useSearchParams();

  // Two things this form's copy/behavior depends on:
  // - ?registered=true  → the user just created an account, greet them accordingly
  // - ?redirect=/some/path → they were bounced here from a protected route;
  //   send them back there after a successful login instead of the default.
  const registered = searchParams.get('registered') === 'true';
  const safeRedirect = getSafeRedirect(searchParams.get('redirect'));

  const t = useTranslations('auth.login');
  const { formAction, onSubmit, isPending, values, fieldError, error } =
    useFormAction(login, loginForm);

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
          action={formAction}
          onSubmit={onSubmit}
          className="bg-surface border border-surface-raised rounded-lg p-6 flex flex-col gap-4"
        >
          <input type="hidden" name="redirect" value={safeRedirect ?? ''} />
          <Input
            label={t('emailLabel')}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email}
            error={fieldError('email')}
          />
          <Input
            label={t('passwordLabel')}
            name="password"
            type="password"
            autoComplete="current-password"
            error={fieldError('password')}
          />

          {error && <p className="text-sm text-error">{error}</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
