'use server';

import type { RegisterResponse } from '@ashen-contracts/shared';
import { redirect } from 'next/navigation';
import { parseForm } from '@/forms/parseForm';
import { ApiEndpoints, postToApi } from '@/http/server';
import { AppPaths } from '@/routes/routes';
import { buildPath } from '@/routes/routeHelpers';
import { registerForm } from './register.schema';
import type { RegisterFormState } from './register.types';

export async function register(
  _previous: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = parseForm(registerForm, formData);
  const email = formData.get('email');
  const values = { email: typeof email === 'string' ? email : '' };
  if (!parsed.success) {
    return { values, fieldErrors: parsed.fieldErrors, error: null };
  }

  const result = await postToApi<RegisterResponse>(ApiEndpoints.auth.register, {
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (!result.ok) return { values, fieldErrors: {}, error: result.error.code };

  redirect(buildPath(AppPaths.login, { registered: 'true' }));
}
