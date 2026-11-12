import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '../../../../test/renderWithIntl';
import { login } from '../login.actions';
import { LoginForm } from './loginForm.component';

const { searchParams } = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams() },
}));

vi.mock('../login.actions', () => ({ login: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.current,
}));

const loginMock = vi.mocked(login);

async function fillAndSubmit(email: string, password: string): Promise<void> {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  loginMock.mockReset();
  searchParams.current = new URLSearchParams();
});

describe('LoginForm', () => {
  it('shows inline errors for an invalid form and does not call the action', async () => {
    renderWithIntl(<LoginForm />);

    // 'a@b' passes the browser's type="email" check (which would block the
    // submit itself) but not the schema's.
    await fillAndSubmit('a@b', '');

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Enter your password.',
    );
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits a valid form to the action', async () => {
    loginMock.mockResolvedValue({ values: {}, fieldErrors: {}, error: null });
    renderWithIntl(<LoginForm />);

    await fillAndSubmit('a@b.co', 'secret');

    expect(loginMock).toHaveBeenCalledOnce();
    const submitted = loginMock.mock.calls[0][1];
    expect(Object.fromEntries(submitted)).toEqual({
      redirect: '',
      email: 'a@b.co',
      password: 'secret',
    });
  });

  it("shows the action's error message and the email again", async () => {
    loginMock.mockResolvedValue({
      values: { email: 'a@b.co' },
      fieldErrors: {},
      error: 'INVALID_CREDENTIALS',
    });
    renderWithIntl(<LoginForm />);

    await fillAndSubmit('a@b.co', 'secret');

    expect(
      await screen.findByText('Incorrect email or password.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it("hides the action's error once the player submits an invalid form", async () => {
    loginMock.mockResolvedValue({
      values: { email: 'a@b.co' },
      fieldErrors: {},
      error: 'INVALID_CREDENTIALS',
    });
    renderWithIntl(<LoginForm />);
    await fillAndSubmit('a@b.co', 'secret');
    await screen.findByText('Incorrect email or password.');

    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(
      screen.queryByText('Incorrect email or password.'),
    ).not.toBeInTheDocument();
  });

  it('disables the button while the action is pending', async () => {
    loginMock.mockReturnValue(new Promise(() => {}));
    renderWithIntl(<LoginForm />);

    await fillAndSubmit('a@b.co', 'secret');

    expect(
      await screen.findByRole('button', { name: 'Logging in…' }),
    ).toBeDisabled();
  });

  it('greets a player who just registered', () => {
    searchParams.current = new URLSearchParams({ registered: 'true' });
    renderWithIntl(<LoginForm />);

    expect(
      screen.getByRole('heading', { name: 'Your name is inked in the ledger' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['/play/map', '/play/map'],
    ['//evil.com', ''],
  ])('passes the ?redirect=%j target on as %j', async (target, expected) => {
    searchParams.current = new URLSearchParams({ redirect: target });
    loginMock.mockResolvedValue({ values: {}, fieldErrors: {}, error: null });
    renderWithIntl(<LoginForm />);

    await fillAndSubmit('a@b.co', 'secret');

    expect(loginMock.mock.calls[0][1].get('redirect')).toBe(expected);
  });
});
