import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '../../../../test/renderWithIntl';
import { register } from '../register.actions';
import { RegisterForm } from './registerForm.component';

vi.mock('../register.actions', () => ({ register: vi.fn() }));

const registerMock = vi.mocked(register);

async function fillAndSubmit(fields: {
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), fields.email);
  await user.type(screen.getByLabelText('Password'), fields.password);
  await user.type(
    screen.getByLabelText('Confirm password'),
    fields.confirmPassword,
  );
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

beforeEach(() => {
  registerMock.mockReset();
});

describe('RegisterForm', () => {
  it('shows inline errors for an invalid form and does not call the action', async () => {
    renderWithIntl(<RegisterForm />);

    await fillAndSubmit({
      email: 'a@b',
      password: 'short',
      confirmPassword: 'other',
    });

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be at least 8 characters.',
    );
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Passwords do not match.');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('clears the inline errors once the form is valid and submits it', async () => {
    registerMock.mockResolvedValue({
      values: {},
      fieldErrors: {},
      error: null,
    });
    renderWithIntl(<RegisterForm />);
    const user = userEvent.setup();

    await fillAndSubmit({
      email: 'a@b.co',
      password: 'password123',
      confirmPassword: 'password124',
    });
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Confirm password'));
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(registerMock).toHaveBeenCalledOnce();
    expect(
      screen.queryByText('Passwords do not match.'),
    ).not.toBeInTheDocument();
  });

  it("shows the action's error message and the email again", async () => {
    registerMock.mockResolvedValue({
      values: { email: 'a@b.co' },
      fieldErrors: {},
      error: 'EMAIL_ALREADY_REGISTERED',
    });
    renderWithIntl(<RegisterForm />);

    await fillAndSubmit({
      email: 'a@b.co',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(
      await screen.findByText('This email is already registered.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it('shows the generic message for a code the web app does not know', async () => {
    registerMock.mockResolvedValue({
      values: {},
      fieldErrors: {},
      error: 'GENERIC',
    });
    renderWithIntl(<RegisterForm />);

    await fillAndSubmit({
      email: 'a@b.co',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
  });
});
