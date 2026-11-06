'use server';

import type { LoginResponse } from '@ashen-contracts/shared';
import { redirect } from 'next/navigation';
import { ApiEndpoints, postToApi, setSessionCookie } from '@/http/server';
import { AppPaths } from '@/routes/routes';
import { getSafeRedirect } from '@/routes/routeHelpers';
import type { LoginFormState } from './login.types';

/**
 * A Server Action is a public POST endpoint: everything in `formData` comes
 * from the client. The API validates the credentials, and the redirect target
 * goes through getSafeRedirect like the ?redirect= it was copied from.
 */
export async function login(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const result = await postToApi<LoginResponse>(ApiEndpoints.auth.login, {
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!result.ok) return { error: result.error.code };

  // The token goes into the httpOnly cookie, never to the browser's JS.
  await setSessionCookie(result.data.accessToken);

  const target = formData.get('redirect');
  redirect(
    (typeof target === 'string' ? getSafeRedirect(target) : null) ??
      AppPaths.play,
  );
}
