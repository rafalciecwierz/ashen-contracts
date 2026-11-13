import { randomInt, randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export interface Player {
  email: string;
  password: string;
}

/**
 * Every test plays as a new player: a unique email, so tests don't share accounts and can run
 * in parallel against the same database, and a unique IP address, so the API's per-IP rate
 * limits (3 registrations an hour, 5 logins a minute) don't add up across tests, retries and
 * repeated local runs against a reused server.
 *
 * The IP travels the way a real one does: the browser sends `X-Forwarded-For`, the BFF forwards
 * its first entry as `X-Client-IP` together with the shared secret (docs/DECISIONS.md #017).
 * On Vercel the platform overwrites the header; `next start` passes it through, which is what
 * makes this possible here.
 */
export const test = base.extend<{ player: Player }>({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
    await use({ ...extraHTTPHeaders, 'X-Forwarded-For': ip });
  },

  player: async ({}, use) => {
    await use({
      email: `player-${randomUUID()}@example.com`,
      password: 'a-long-enough-password',
    });
  },
});

export async function register(page: Page, { email, password }: Player) {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

export async function logIn(page: Page, { email, password }: Player) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}
