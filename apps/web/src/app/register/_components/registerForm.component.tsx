'use client';

import { useActionState, useState, type SubmitEvent } from 'react';
import { Input, Button } from '@ashen-contracts/ui';
import { PASSWORD_MIN_LENGTH } from '@ashen-contracts/shared';
import { register } from '../register.actions';
import { RegisterFieldErrors } from '../register.types';
import type { ValidationMessageKey } from '@/i18n/validationKey';
import { registerErrorKeys, registerFormSchema } from '../register.schema';
import { useTranslations } from 'next-intl';

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tErrors = useTranslations('errors');
  const tValidation = useTranslations('validation');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [state, formAction, pending] = useActionState(register, {
    error: null,
  });

  function validate(): boolean {
    const result = registerFormSchema.safeParse(
      { email, password, confirmPassword },
      { error: registerErrorKeys },
    );
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: RegisterFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof RegisterFieldErrors;
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
      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface border border-surface-raised rounded-lg p-6 flex flex-col gap-4"
      >
        <h1 className="text-xl font-heading text-ink">{t('title')}</h1>

        <Input
          label={t('emailLabel')}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email ? tValidation(fieldErrors.email) : undefined}
        />
        <Input
          label={t('passwordLabel')}
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={
            fieldErrors.password
              ? tValidation(fieldErrors.password, { min: PASSWORD_MIN_LENGTH })
              : undefined
          }
        />
        <Input
          label={t('confirmPasswordLabel')}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={
            fieldErrors.confirmPassword
              ? tValidation(fieldErrors.confirmPassword)
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
    </main>
  );
}
