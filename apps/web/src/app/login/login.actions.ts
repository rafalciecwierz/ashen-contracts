'use server';

import type { LoginResponse } from '@ashen-contracts/shared';
import { redirect } from 'next/navigation';
import { parseForm } from '@/forms/parseForm';
import { ApiEndpoints, postToApi, setSessionCookie } from '@/http/server';
import { AppPaths } from '@/routes/routes';
import { getSafeRedirect } from '@/routes/routeHelpers';
import { loginForm } from './login.schema';
import type { LoginFormState } from './login.types';

export async function login(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = parseForm(loginForm, formData);
  const email = formData.get('email');
  const values = { email: typeof email === 'string' ? email : '' };
  if (!parsed.success) {
    return { values, fieldErrors: parsed.fieldErrors, error: null };
  }

  const result = await postToApi<LoginResponse>(
    ApiEndpoints.auth.login,
    parsed.data,
  );

  if (!result.ok) return { values, fieldErrors: {}, error: result.error.code };

  await setSessionCookie(result.data.accessToken);

  const target = formData.get('redirect');
  redirect(
    (typeof target === 'string' ? getSafeRedirect(target) : null) ??
      AppPaths.play,
  );
}
