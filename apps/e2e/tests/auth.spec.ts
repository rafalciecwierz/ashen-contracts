import { expect, logIn, register, test } from './fixtures';

test('registers, logs in, plays and logs out', async ({ page, player }) => {
  await register(page, player);
  await expect(page).toHaveURL('/login?registered=true');
  await expect(
    page.getByRole('heading', { name: 'Your name is inked in the ledger' }),
  ).toBeVisible();

  await logIn(page, player);
  await expect(page).toHaveURL('/play');
  await expect(
    page.getByRole('heading', { name: 'The road awaits' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Unnamed Hero' }).click();
  await expect(page.getByText(player.email)).toBeVisible();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/login');

  // The session cookie is gone, not just the page.
  await page.goto('/play');
  await expect(page).toHaveURL('/login?redirect=%2Fplay');
});

test('sends a logged-out player to /login and back to /play', async ({
  page,
  player,
}) => {
  await register(page, player);
  await expect(page).toHaveURL('/login?registered=true');

  await page.goto('/play');
  await expect(page).toHaveURL('/login?redirect=%2Fplay');
  await expect(
    page.getByRole('heading', { name: 'The gates remain sealed' }),
  ).toBeVisible();

  await logIn(page, player);
  await expect(page).toHaveURL('/play');
});

test('shows an inline error for an email that is already registered', async ({
  page,
  player,
}) => {
  await register(page, player);
  await expect(page).toHaveURL('/login?registered=true');

  await register(page, player);
  await expect(
    page.getByText('This email is already registered.'),
  ).toBeVisible();
  await expect(page).toHaveURL('/register');
  await expect(page.getByLabel('Email')).toHaveValue(player.email);
});
