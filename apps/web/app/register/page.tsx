'use client';

import { SubmitEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Input, Button } from '@ashen-contracts/ui';
import type { RegisterResponse } from '@ashen-contracts/shared';
import { ApiError, apiPost } from '@/src/http/api';

const registerSchema = z
  .object({
    email: z.email({ error: 'Enter a valid email address.' }),
    password: z.string().min(8, { error: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = registerSchema.safeParse({ email, password, confirmPassword });
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof FieldErrors;
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
      await apiPost<RegisterResponse>('/auth/register', { email, password });
      router.push('/login?registered=true');
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
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
        <h1 className="text-xl font-heading text-ink">Create your account</h1>

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
        />

        {serverError && <p className="text-sm text-error">{serverError}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </main>
  );
}