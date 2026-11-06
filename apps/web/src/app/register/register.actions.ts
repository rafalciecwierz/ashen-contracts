'use server';

import type { RegisterResponse } from '@ashen-contracts/shared';
import { redirect } from 'next/navigation';
import { ApiEndpoints, postToApi } from '@/http/server';
import { AppPaths } from '@/routes/routes';
import { buildPath } from '@/routes/routeHelpers';
import type { RegisterFormState } from './register.types';

/**
 * Sends only what the API accepts: confirmPassword is a form-only field, and
 * the API's strict schema would reject it.
 */
export async function register(
  _previous: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const result = await postToApi<RegisterResponse>(ApiEndpoints.auth.register, {
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!result.ok) return { error: result.error.code };

  redirect(buildPath(AppPaths.login, { registered: 'true' }));
}
