import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formData } from '../../../test/formData';
import { register } from './register.actions';
import type { RegisterFormState } from './register.types';

const { postToApi, redirect } = vi.hoisted(() => ({
  postToApi: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect: ${url}`);
  }),
}));

vi.mock('@/http/server', () => ({
  ApiEndpoints: { auth: { register: '/auth/register' } },
  postToApi,
}));
vi.mock('next/navigation', () => ({ redirect }));

const initial: RegisterFormState = {
  values: {},
  fieldErrors: {},
  error: null,
};

const validForm = {
  email: 'A@B.co',
  password: 'password123',
  confirmPassword: 'password123',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('register', () => {
  it('returns field errors for an invalid form without calling the API', async () => {
    const state = await register(
      initial,
      formData({ ...validForm, confirmPassword: 'password124' }),
    );

    expect(state).toEqual({
      values: { email: 'A@B.co' },
      fieldErrors: { confirmPassword: 'passwordsDoNotMatch' },
      error: null,
    });
    expect(postToApi).not.toHaveBeenCalled();
  });

  it("returns the API's error code and never the passwords", async () => {
    postToApi.mockResolvedValue({
      ok: false,
      error: { code: 'EMAIL_ALREADY_REGISTERED' },
    });

    const state = await register(initial, formData(validForm));

    expect(state).toEqual({
      values: { email: 'A@B.co' },
      fieldErrors: {},
      error: 'EMAIL_ALREADY_REGISTERED',
    });
    expect(JSON.stringify(state)).not.toContain('password123');
  });

  it('sends the email and password without confirmPassword, then redirects to the login page', async () => {
    postToApi.mockResolvedValue({
      ok: true,
      data: { id: '1', email: 'a@b.co' },
    });

    await expect(register(initial, formData(validForm))).rejects.toThrow(
      'redirect: /login?registered=true',
    );

    expect(postToApi).toHaveBeenCalledWith('/auth/register', {
      email: 'a@b.co',
      password: 'password123',
    });
  });
});
