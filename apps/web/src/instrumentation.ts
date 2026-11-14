/**
 * Runs once when a Next.js server starts (`next dev`, `next start`), before it
 * serves a request: an invalid environment stops it here, not on a player's
 * first login. Only in the Node.js runtime, as nothing here runs on the Edge.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { getServerEnv } = await import('./config/serverEnv');
  getServerEnv();
}
