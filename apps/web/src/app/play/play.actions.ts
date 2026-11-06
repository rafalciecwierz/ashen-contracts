'use server';

import { redirect, RedirectType } from 'next/navigation';
import { clearSessionCookie } from '@/http/server';
import { AppPaths } from '@/routes/routes';

// A Server Action is always a POST, which logging out has to be: it changes
// state, and GET requests can be fired by link prefetching or an <img> tag on
// another site. Next.js also rejects an action whose Origin isn't this host.
export async function logout(): Promise<void> {
  await clearSessionCookie();
  // replace: Back from /login must not return to /play.
  redirect(AppPaths.login, RedirectType.replace);
}
