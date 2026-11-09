'use client';

import { useTranslations } from 'next-intl';
import { Input, Button } from '@ashen-contracts/ui';
import { register } from '../register.actions';
import { registerForm } from '../register.schema';
import { useFormAction } from '@/forms/useFormAction';

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const { formAction, onSubmit, isPending, values, fieldError, error } =
    useFormAction(register, registerForm);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <form
        action={formAction}
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-surface border border-surface-raised rounded-lg p-6 flex flex-col gap-4"
      >
        <h1 className="text-xl font-heading text-ink">{t('title')}</h1>

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
          autoComplete="new-password"
          error={fieldError('password')}
        />
        <Input
          label={t('confirmPasswordLabel')}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={fieldError('confirmPassword')}
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </main>
  );
}
