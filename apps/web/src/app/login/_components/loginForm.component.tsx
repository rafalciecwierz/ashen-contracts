'use client';

import { useActionState, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input, Button } from '@ashen-contracts/ui';
import { loginSchema } from '@ashen-contracts/shared';
import { loginErrorKeys } from '../login.schema';
import { login } from '../login.actions';
import type { LoginFieldErrors } from '../login.types';
import type { ValidationMessageKey } from '@/i18n/validationKey';
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
  const tValidation = useTranslations('validation');
  const tErrors = useTranslations('errors');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [state, formAction, pending] = useActionState(login, { error: null });

  function validate(): boolean {
    const result = loginSchema.safeParse(
      { email, password },
      { error: loginErrorKeys },
    );
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: LoginFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof LoginFieldErrors;
      if (!errors[field]) errors[field] = issue.message as ValidationMessageKey;
    }
    setFieldErrors(errors);
    return false;
  }

  // Runs before the action; preventDefault() stops the submit. Without
  // JavaScript the form posts straight to the action, and the API validates.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    if (!validate()) event.preventDefault();
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
          action={formAction}
          onSubmit={handleSubmit}
          className="bg-surface border border-surface-raised rounded-lg p-6 flex flex-col gap-4"
        >
          <input type="hidden" name="redirect" value={safeRedirect ?? ''} />
          <Input
            label={t('emailLabel')}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={
              fieldErrors.email ? tValidation(fieldErrors.email) : undefined
            }
          />
          <Input
            label={t('passwordLabel')}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={
              fieldErrors.password
                ? tValidation(fieldErrors.password)
                : undefined
            }
          />

          {state.error && (
            <p className="text-sm text-error">{tErrors(state.error)}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
