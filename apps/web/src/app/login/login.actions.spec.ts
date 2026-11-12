import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formData } from '../../../test/formData';
import { login } from './login.actions';
import type { LoginFormState } from './login.types';

const { postToApi, setSessionCookie, redirect } = vi.hoisted(() => ({
  postToApi: vi.fn(),
  setSessionCookie: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect: ${url}`);
  }),
}));

vi.mock('@/http/server', () => ({
  ApiEndpoints: { auth: { login: '/auth/login' } },
  postToApi,
  setSessionCookie,
}));
vi.mock('next/navigation', () => ({ redirect }));

const initial: LoginFormState = { values: {}, fieldErrors: {}, error: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('login', () => {
  it('returns field errors for an invalid form without calling the API', async () => {
    const state = await login(
      initial,
      formData({ email: 'nope', password: '' }),
    );

    expect(state).toEqual({
      values: { email: 'nope' },
      fieldErrors: { email: 'invalidEmail', password: 'passwordRequired' },
      error: null,
    });
    expect(postToApi).not.toHaveBeenCalled();
  });

  it("returns the API's error code and never the password", async () => {
    postToApi.mockResolvedValue({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });

    const state = await login(
      initial,
      formData({ email: 'a@b.co', password: 'secret' }),
    );

    expect(state).toEqual({
      values: { email: 'a@b.co' },
      fieldErrors: {},
      error: 'INVALID_CREDENTIALS',
    });
    expect(JSON.stringify(state)).not.toContain('secret');
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it('sends the parsed credentials, sets the session cookie and redirects to /play', async () => {
    postToApi.mockResolvedValue({ ok: true, data: { accessToken: 'jwt' } });

    await expect(
      login(
        initial,
        formData({ email: ' A@B.co ', password: 'secret', redirect: '' }),
      ),
    ).rejects.toThrow('redirect: /play');

    expect(postToApi).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.co',
      password: 'secret',
    });
    expect(setSessionCookie).toHaveBeenCalledWith('jwt');
  });

  it('redirects to a safe redirect target', async () => {
    postToApi.mockResolvedValue({ ok: true, data: { accessToken: 'jwt' } });

    await expect(
      login(
        initial,
        formData({ email: 'a@b.co', password: 'x', redirect: '/play/map' }),
      ),
    ).rejects.toThrow('redirect: /play/map');
  });

  it.each(['//evil.com', 'https://evil.com', '/\t/evil.com'])(
    'ignores the unsafe redirect target %j',
    async (target) => {
      postToApi.mockResolvedValue({ ok: true, data: { accessToken: 'jwt' } });

      await expect(
        login(
          initial,
          formData({ email: 'a@b.co', password: 'x', redirect: target }),
        ),
      ).rejects.toThrow('redirect: /play');
      expect(redirect).toHaveBeenCalledWith('/play');
    },
  );
});
