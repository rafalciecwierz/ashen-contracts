'use client';

import { SubmitEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button } from '@ashen-contracts/ui';
import type { RegisterResponse } from '@ashen-contracts/shared';
import { ApiError, apiPost } from '@/src/http/api';
import { RegisterFieldErrors } from './register.types';
import { registerSchema } from './register.schema';
import { ApiEndpoints } from '@/src/http/endpoints';
import { AppPaths, buildPath } from '@/src/routes/routes';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('auth.register');
  const tErrors = useTranslations('errors');
  const tValidation = useTranslations('validation');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = registerSchema.safeParse({ email, password, confirmPassword });
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: RegisterFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof RegisterFieldErrors;
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
      await apiPost<RegisterResponse>(ApiEndpoints.auth.register, { email, password });
      router.push(buildPath(AppPaths.login, { registered: 'true' }));
    } catch (err) {
      setServerError(err instanceof ApiError ? tErrors(err.code ?? 'GENERIC') : tErrors('GENERIC'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface border border-surface-raised rounded-lg p-6 flex flex-col gap-4"
      >
        <h1 className="text-xl font-heading text-ink">
          {t('title')}
        </h1>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password ? tValidation(fieldErrors.password) : undefined}
        />
        <Input
          label={t('confirmPasswordLabel')}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword ? tValidation(fieldErrors.confirmPassword) : undefined}
        />

        {serverError && <p className="text-sm text-error">{serverError}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>
    </main>
  );
}